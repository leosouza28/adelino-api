import axios from "axios"

export default async (html = '', output = '', filename = ''): Promise<ArrayBuffer> => {
    const body = JSON.stringify({
        "filename": filename,
        "output": output,
        "auto_size": true,
        "html": html
    });

    const bodySize = Buffer.byteLength(body, 'utf8');
    // console.log(`Request body size: ${bodySize} bytes`);

    return axios.post(
        'https://pdf.patricklobo.com/convert',
        body,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer'
        }
    )
}