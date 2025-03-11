'use strict';

const KOSTAL = require('./third_party/kostal').KOSTAL;
const http = require('http');
const https = require('https');

class PlenticoreAPI {
    #sessionId;
    #logger;
    #host;
    #port;
    #useHTTPS;
    #password;
    #errorCounter;

    constructor(host, port, useHTTPS, password, logger) {
        this.loggedIn = false;
        this.#logger = logger;
        this.#host = host;
        this.#port = port;
        this.#useHTTPS = useHTTPS;
        this.#password = password;
        this.#errorCounter = 0;
    }

    async apiCall(method, endpoint, data) {
        if (!method) {
            this.#logger.warn('Missing method in http request');
            throw new Error('no method given');
        } else if (!endpoint) {
            this.#logger.warn('Missing endpoint in http request');
            throw new Error('no endpoint given');
        }
        method = method.toUpperCase();
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        var headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:71.0) Gecko/20100101 Firefox/71.0',
        };
        if (data) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.#sessionId) {
            headers['Authorization'] = `Session ${this.#sessionId}`;
        }
        var reqOpts = {
            method: method,
            port: this.#port,
            host: this.#host,
            path: `/api/v1/${endpoint}`,
            headers: headers,
            rejectUnauthorized: false,
        };

        return new Promise((resolve, reject) => {
            var request;
            if (this.#useHTTPS) {
                request = https.request(reqOpts);
            } else {
                request = http.request(reqOpts);
            }
            this.#logger.debug(`Making request to endpoint ${endpoint} with data ${JSON.stringify(reqOpts)}`);
            request.on('response', response => {
                let code = response.statusCode;
                let headers = response.headers;
                response.setEncoding('utf8');
                var body = '';
                response.on('data', chunk => {
                    body += chunk;
                });
                response.on('end', () => {
                    this.#logger.debug(
                        `Result of request: ${JSON.stringify({ code: code, headers: headers, body: body })}`,
                    );
                    if (code >= 200 && code <= 299) {
                        this.#errorCounter = 0;
                    } else {
                        this.#errorCounter++;
                    }

                    if (this.#errorCounter > 5) {
                        this.loggedIn = false;
                        reject(new Error('to many api call errors'));
                    }

                    resolve({ body: body, code: code, headers: headers });
                });
            });

            request.on('error', error => {
                this.loggedIn = false;
                this.#logger.warn(`API request failed with error ${JSON.stringify(error)}`);
                reject(new Error(`API request failed with error ${JSON.stringify(error)}`));
            });
            request.on('close', () => {
                this.#logger.debug('API connection closed');
            });

            if (data && (method === 'POST' || method === 'PUT')) {
                this.#logger.debug(`Sending post data to request: ${data}`);
                request.write(data);
            }
            request.end();
        });
    }

    async login() {
        let nonce = KOSTAL.getNonce();
        let payload = {
            username: 'user',
            nonce: nonce,
        };

        let ret;
        try {
            ret = await this.apiCall('POST', 'auth/start', payload);
            if (
                ret.code == 401 ||
                ret.code == 403 ||
                (ret.code == 400 && ret.body != undefined && ret.body == '{"message":"authentication failed"}\n')
            ) {
                this.#logger.warn(`auth start failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject('auth');
            } else if (ret.code !== 200) {
                this.#logger.warn(`auth start failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject(`auth start failed with code ${ret.code}`);
            }
        } catch (e) {
            this.#logger.warn(e);
            return Promise.reject(e);
        }

        var json = JSON.parse(ret.body);
        if (!json.nonce) {
            this.#logger.warn(`No nonce in json reply to start: ${ret.body}`);
            return Promise.resolve(-3);
        }

        var mainTransactionId = json.transactionId;
        var serverNonce = json.nonce;
        var salt = json.salt;
        var hashRounds = parseInt(json.rounds);

        var r = KOSTAL.pbkdf2(this.#password, KOSTAL.base64.toBits(salt), hashRounds);
        var sKey = new KOSTAL.hash.hmac(r, KOSTAL.hash.sha256).mac('Client Key');
        var cKey = new KOSTAL.hash.hmac(r, KOSTAL.hash.sha256).mac('Server Key');
        var sHash = KOSTAL.hash.sha256.hash(sKey);
        var hashString = `n=user,r=${nonce},r=${serverNonce},s=${salt},i=${hashRounds},c=biws,r=${serverNonce}`;
        var sHmac = new KOSTAL.hash.hmac(sHash, KOSTAL.hash.sha256).mac(hashString);
        var cHmac = new KOSTAL.hash.hmac(cKey, KOSTAL.hash.sha256).mac(hashString);
        var proof = sKey.map(function (l, n) {
            return l ^ sHmac[n];
        });

        let payload2 = {
            transactionId: mainTransactionId,
            proof: KOSTAL.base64.fromBits(proof),
        };

        try {
            ret = await this.apiCall('POST', 'auth/finish', payload2);
            if (
                ret.code == 401 ||
                ret.code == 403 ||
                (ret.code == 400 && ret.body != undefined && ret.body == '{"message":"authentication failed"}\n')
            ) {
                this.#logger.warn(`auth finish failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject('auth');
            } else if (ret.code !== 200) {
                this.#logger.warn(`auth finish failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject(`auth finish failed with code ${ret.code}`);
            }
        } catch (e) {
            this.#logger.warn(e);
            return Promise.reject(e);
        }

        json = JSON.parse(ret.body);
        if (!json.token) {
            this.#logger.warn(`No nonce in json reply to finish: ${ret.body}`);
            return Promise.reject('No nonce in json reply to finish');
        }

        var bitSignature = KOSTAL.base64.toBits(json.signature);

        if (!KOSTAL.bitArray.equal(bitSignature, cHmac)) {
            this.#logger.warn('Signature verification failed!');
            return Promise.reject('Signature verification failed!');
        }

        var hashHmac = new KOSTAL.hash.hmac(sHash, KOSTAL.hash.sha256);
        hashHmac.update('Session Key');
        hashHmac.update(hashString);
        hashHmac.update(sKey);
        var digest = hashHmac.digest();
        json.protocol_key = digest;
        json.transactionId = mainTransactionId;

        var pkey = json.protocol_key,
            tok = json.token,
            transId = json.transactionId,
            encToken = KOSTAL.encrypt(pkey, tok);
        var iv = encToken.iv,
            tag = encToken.tag,
            ciph = encToken.ciphertext,
            payload3 = {
                transactionId: transId,
                iv: KOSTAL.base64.fromBits(iv),
                tag: KOSTAL.base64.fromBits(tag),
                payload: KOSTAL.base64.fromBits(ciph),
            };

        try {
            ret = await this.apiCall('POST', 'auth/create_session', payload3);
            if (ret.code == 401 || ret.code == 403) {
                this.#logger.warn(`auth/create_session failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject('auth');
            } else if (ret.code !== 200) {
                this.#logger.warn(`auth/create_session failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject(`auth/create_session failed with code ${ret.code}`);
            }
        } catch (e) {
            this.#logger.warn(e);
            return Promise.reject(e);
        }

        json = JSON.parse(ret.body);
        if (!json.sessionId) {
            this.#logger.warn(`No session id in json reply to create session: ${ret.body}`);
            return Promise.reject('No session id in json reply to create session');
        }

        this.#logger.info('logged in to plenticore');
        this.#sessionId = json.sessionId;
        this.loggedIn = true;
        return Promise.resolve(0);
    }

    async getAllProcessData() {
        let ret;
        try {
            ret = await this.apiCall('GET', 'processdata', null);
            if (ret.code == 401 || ret.code == 403) {
                this.#logger.warn(`auth/create_session failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject('auth');
            } else if (ret.code !== 200) {
                this.#logger.warn(`get all process data failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject(`get all process data failed with code ${ret.code}`);
            }
        } catch (e) {
            this.#logger.warn(e);
            return Promise.reject(e);
        }
        return Promise.resolve(JSON.parse(ret.body));
    }

    async getProcessData(pdPollIDs) {
        try {
            let ret = await this.apiCall('POST', 'processdata', pdPollIDs);
            if (ret.code == 401 || ret.code == 403) {
                this.#logger.warn(`auth/create_session failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject('auth');
            } else if (ret.code !== 200) {
                this.#logger.warn(`get process data values failed with code ${ret.code}: ${ret.body}`);
                return Promise.reject(`get process data values failed with code ${ret.code}`);
            }
            return Promise.resolve(JSON.parse(ret.body));
        } catch (e) {
            this.#logger.warn(e);
            return Promise.reject(e);
        }
    }
}

module.exports = PlenticoreAPI;
