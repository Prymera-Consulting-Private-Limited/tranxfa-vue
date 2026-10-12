// @vitest-environment node
//
// Everything else in this suite mocks axios, which means an axios upgrade can
// change the shape of a rejection and leave all 237 other tests green. This
// file is the exception: it drives the real library against a real server.
//
// It exists because the SPA reads `e.status` off rejections in 44 places
// across 19 files - including main.js, where `e.status === 401` is the only
// thing that sends a logged-out customer back to sign-in. `status` is a
// relatively recent addition to AxiosError. If a future bump drops or renames
// it, sign-in breaks silently and no mocked test notices.
//
// Node environment on purpose: jsdom cannot serve a real request. The property
// under test is assigned in the AxiosError constructor
// (`this.status = response.status`), reached through core/settle.js, which is
// the shared path for every adapter - so pinning it here also pins it for the
// XHR adapter the browser uses.
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import axios from 'axios';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let server;
let client;

beforeAll(async () => {
    server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const code = Number(url.searchParams.get('code') || 200);
        res.writeHead(code, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            seenAccept: req.headers['accept'],
            seenNgrok: req.headers['ngrok-skip-browser-warning'],
            query: Object.fromEntries(url.searchParams),
            message: 'from server',
        }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    // The same configuration main.js applies to the global axios instance, on
    // an isolated instance so the test cannot leak into anything else.
    client = axios.create({
        baseURL: `http://127.0.0.1:${server.address().port}`,
        withCredentials: true,
        withXSRFToken: true,
    });
    client.interceptors.request.use((config) => {
        config.headers['Accept'] = 'application/json';
        config.headers['ngrok-skip-browser-warning'] = 'yes';

        return config;
    });
});

afterAll(() => new Promise(resolve => server.close(resolve)));

/**
 * @returns {Promise<Error>} the rejection, failing the test if none came
 */
async function rejectionFrom(promise) {
    try {
        await promise;
    } catch (e) {
        return e;
    }
    throw new Error('expected the request to reject');
}

describe('the rejection shape the SPA branches on', () => {
    // 401 is the one that matters most: main.js redirects to sign-in on
    // `e.status === 401`, not `e.response.status`.
    it.each([401, 403, 404, 422, 500])('sets e.status on a %i', async (code) => {
        const e = await rejectionFrom(client.get(`/thing?code=${code}`));

        expect(e.status).toBe(code);
    });

    it.each([403, 422])('still carries the response body on a %i', async (code) => {
        const e = await rejectionFrom(client.get(`/thing?code=${code}`));

        expect(e.response.status).toBe(code);
        expect(e.response.data.message).toBe('from server');
    });

    // customer_utils.js sets this flag and main.js reads it back off
    // `e.config` to suppress the redirect. It has to survive the round trip.
    it('preserves a custom config flag through to the rejection', async () => {
        const e = await rejectionFrom(
            client.get('/thing?code=401', {skipAuthRedirect: true}),
        );

        expect(e.config.skipAuthRedirect).toBe(true);
        expect(e.status).toBe(401);
    });

    // Nine call sites use `e.response?.status`, which only makes sense if a
    // response can be absent. On a dead connection both are undefined, and
    // main.js must fall through its 401 check rather than throwing inside the
    // interceptor.
    it('leaves status and response undefined when there was no response', async () => {
        const dead = axios.create({baseURL: 'http://127.0.0.1:1', timeout: 2000});
        const e = await rejectionFrom(dead.get('/thing'));

        expect(e.response).toBeUndefined();
        expect(e.status).toBeUndefined();
        expect(e.status === 401).toBe(false);
    });
});

describe('the request configuration main.js relies on', () => {
    it('applies interceptor headers to the outgoing request', async () => {
        const {data} = await client.get('/thing');

        expect(data.seenAccept).toBe('application/json');
        expect(data.seenNgrok).toBe('yes');
    });

    it('serialises params, as the account-verification token call needs', async () => {
        const {data} = await client.get('/thing', {params: {file_name: 'a.png', return_url: null}});

        // A null param is dropped rather than sent as "null".
        expect(data.query.file_name).toBe('a.png');
        expect(data.query.return_url).toBeUndefined();
    });

    // aws_s3_utils.js turns both off per request to upload straight to S3.
    it('honours a per-request credential override', async () => {
        const response = await client.get('/thing', {
            withXSRFToken: false,
            withCredentials: false,
        });

        expect(response.status).toBe(200);
    });
});

describe('drift guard', () => {
    // If someone rewrites the interceptor to read e.response.status instead,
    // the reasoning above stops matching the code and this file needs
    // revisiting. Deliberately a loose substring, not a formatting match.
    it('main.js still branches on e.status', () => {
        const source = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');

        expect(source).toContain('e.status');
        expect(source).toContain('skipAuthRedirect');
    });
});
