import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { logDev } from "../../util";
import { credential } from "firebase-admin";

logDev("Apps", getApps().length);

const app = !getApps().length ? initializeApp({
    credential: credential.cert({
        // @ts-ignore
        "type": "service_account",
        "project_id": "lsdevelopers",
        "private_key_id": "da9c3c325e9653b30f6127fa98bb5bd7f778bf2f",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCoJ1/rNiJV/qwd\nVQWrLbuTW2SF7cTwuo2TnQ8I93HeAAKAmbUGOPCzh4GrOL448Cu+4X+PqoAnTbH0\nVqHOKdn+Yg+daHEfRhPXEuHWFbleeWeLZVurfIFBe3iDDqx0ZZlMllZQ/4hU/u9J\nk8hPT2+wu4uurxqRFiDr/CoxbEy0lrbbWl8Wz7tBpC2L83NuI8/sRbbAghesBSoc\nvHZlzpO8RUuwD4ym82SqT0z43Kqr12TLhbRf2dIvvHkDsvfR0sbDL3DbKWYb7jAb\nUGSNM7tG0BpSoJdD43yU0/kQXludAdKRbxZTNMjRRCN7cqAf6AlXHQfItaCSCDIP\n8ON/3SR5AgMBAAECggEAULY9myfryT0pnhauVuDntS5cDND5A9d3l0/+5H3pQPbe\nPJ4KvwbbukCjo+zjmW7mgIO6d9oOE09+yFpA5jU+dpTZC+QS0EERyt08W0coJ8m8\nQrOPEbv8StMaIEYNzvzpXVKX8d8FsE6Byt5NeowVf042GM3hwZxOhxcNpZVnKBKc\nWTKzblUSWIvhHeqplBKzz/YvDvY0FszPq1PN6BEaEf2HMud0ynGeoj4P1zo2B65m\nDXldNBLSbSPrsGrGFWN+xh/VUAy5no+X0nxZNrXhY3+Y/a80rA8XBdh4H7xfE6cs\nzpN5habJnlNtatIsh4UuQ8sqy4e/VZCewqE91LC2dQKBgQDRTSoNWSasnZqi7hS7\n4FOWH/Oo7DAd2djNYStGCBMDb6O91V1j5nLF9UktNQTbZVC0t2KPrplLrBFJ6Jhj\n0CtC0nPCsBE8CCYUYXjzxwGMv3i1NRXQ2s4dyXcRlqicvrO8fb7FRBr47Dg5Hjtq\nuP3sMfNvkSGFBHq76sJ7JqbVhwKBgQDNq/MIymzKAdfeidHMPj61nzggOnm/Dkg0\n/DAZfbLz09Udk993aE57A7raq5U61mmKERDZ/UDlTqFBxZwAl3rmqqrWzYOfWElS\nY41OEJPSYMJAlt8O8XKClhQsn4YMu8PQ+GIVl8klJgEidT4dcBSScJEIefb2T3vU\n7XWxjRq1/wKBgE80lWJhx3nxVpCr6lrC5L7eLpZRc1AInbvzNq4U5iUZvWxcbzAc\nCHkTfvLFqqXgLG+HKpxXJZn2bsB6bhjvsT9jZv1ZJdyC9O4niN8wA00hNGvWv/++\nndu13wJf8kUHAful1mjOgiqLMiejYjbb9PPKX2ZsFLRC4rN0fs6d7OrHAoGAPOg/\nAMtxjCEfnHeT+bg1OfP82w52H25LU+WbGPFwnWSOKEQyWVo6Y5OnMjq95r64YnrL\nUsL9BOtUNfYfTM2PR+Ai15nk8Ltke1Gf9w5RuGuPGzGSvQojryhisRRMzliMlMX5\nxgs9NhMbIuk1i+I1NWjAipIT4L2JHnVz9TCkSGECgYAUTCHJYlWRhgezvC6lpJOy\nRNTpDnYwJH7G5qgq8CzyaZttVwqpv7aXZtGJq1I3SjSBW4nY8ACzCOv8Fsm0huYy\nodQdjlJ/cHOpZOxghb05qE82iajF/KLhp/H8cTsqAIecyqwO7uB9zasbWoymsANp\n6k6jlzdt1m6KSwIC6RPydw==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-fbsvc@lsdevelopers.iam.gserviceaccount.com",
        "client_id": "105056694260146973679",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40lsdevelopers.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
}) : getApp();
const storage = getStorage(app).bucket();

logDev("Firebase initialized");
logDev("Apps", getApps().length);

export { app, storage };