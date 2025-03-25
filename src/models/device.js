class Device {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    deviceType = null;

    /**
     * @type {String|null}
     */
    clientCode = null;

    /**
     * @type {String|null}
     */
    clientName = null;

    /**
     * @type {String|null}
     */
    clientVersion = null;

    /**
     * @type {String|null}
     */
    osCode = null;

    /**
     * @type {String|null}
     */
    osName = null;

    /**
     * @type {String|null}
     */
    osVersion = null;

    /**
     * @type {String|null}
     */
    architecture = null;

    /**
     * @type {String|null}
     */
    vendor = null;

    /**
     * @type {String|null}
     */
    model = null;

    /**
     * @type {String|null}
     */
    touchedAt = null;

    /**
     * @type {Boolean}
     */
    isCurrent = false;

    static getInstance(data) {
        const device = new Device();
        device.id = data.id;
        device.deviceType = data.device_type;
        device.clientCode = data.client_code;
        device.clientName = data.client_name;
        device.clientVersion = data.client_version;
        device.osCode = data.os_code;
        device.osName = data.os_name;
        device.osVersion = data.os_version;
        device.architecture = data.architecture;
        device.vendor = data.vendor;
        device.model = data.model;
        device.touchedAt = data.touched_at;
        device.isCurrent = data.is_current;
        return device;
    }
}

export default Device;