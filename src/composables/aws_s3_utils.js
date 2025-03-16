import axios from "axios";

export function useAwsS3Utils () {
    /**
     *
     * @param {string} url
     * @param {File} fileObj
     * @param {Function|null} progressCb
     * @returns
     */
    const uploadToPreSignedS3Url = async (url, fileObj, progressCb = null) => {

        await axios.put(url, fileObj.file, {
            headers: {
                "Content-Type": fileObj.file.type,
            },
            onUploadProgress: (progressEvent) => {
                if (progressCb) {
                    progressCb(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                }
            },
        }).then(() => {
            return new URL(url).pathname.split('/').slice(2).join('/');
        });
    };

    return {
        uploadToPreSignedS3Url,
    };
}