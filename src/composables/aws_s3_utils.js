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

        return axios.put(url, fileObj, {
            headers: {
                "Content-Type": fileObj.type,
            },
            onUploadProgress: (progressEvent) => {
                if (progressCb) {
                    progressCb(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                }
            },
        })
    };

    return {
        uploadToPreSignedS3Url,
    };
}