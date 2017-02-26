/* jshint esnext: true */
/* jshint node: true */

'use strict';

var request = require('request');
var moment = require('moment');
var winston = require('winston');

winston.add(winston.transports.File, { filename: 'somefile.log' });
winston.level = 'debug';

const BASE_URL = 'https://my.tado.com';
const CLIENT_ID = 'tado-webapp';
const REFERER = 'https://my.tado.com/';

module.exports = class ApiClient {
    login(username, password) {
        this.username = username;
        this.password = password;

        return new Promise((resolve, reject) => {
            /*request.post({
                url: BASE_URL + '/oauth/token',
                qs: {
                    client_id: CLIENT_ID,
                    grant_type: 'password',
                    password: password,
                    username: username,
                    scope: 'home.user'
                },
                json: true
            }, (err, response, result) => {
                if (err || response.statusCode !== 200) {
                    reject(err || result);
                } else {
                    this.saveToken(result);
                    resolve(true);
                }
            });*/
            resolve(true);
        });
    }

    saveToken(token) {
//        console.log(token);
        this.token = token;
        console.log('Ref: ' + this.token.refresh_token);
        this.token.expires_in = moment().add(token.expires_in, 'seconds').toDate();
        console.log('[%s] NEW TOKEN [Expires in: %s]', moment().toString(), this.token.expires_in.toString());
    }

    refreshToken() {
        return new Promise((resolve, reject) => {
            /*if (!this.token) {
                console.log('no token');
                return reject(new Error('not logged in'));
            }

            if (moment().diff(this.token.expires_in, 'minutes') < -8) {
                console.log('ducking out');
                return resolve();
            }

            console.log('Refreshing: ' + moment().diff(this.token.expires_in, 'minutes'));

            request.get({
                url: BASE_URL + '/oauth/token',
                qs: {
                    client_id: CLIENT_ID,
                    grant_type: 'refresh_token',
                    refresh_token: this.token.refresh_token,
                    scope: 'home.user'
                },
                json: true
            }, (err, response, result) => {
                if (err || response.statusCode !== 200) {
                    console.log('Error refreshing token: ', err, response.statusCode);

                    reject(err || result);
                } else {
                    console.log('Token Refreshed');

                    this.saveToken(result);
                    resolve(true);
                }
            });*/
            resolve(true);
        });
    }

    api(path, passback) {
        //console.log('b');
       /* return this
            .refreshToken()
            .then(() => {*/
          //      console.log('c');
                return new Promise((resolve, reject) => {
                    request.get({
                        url: BASE_URL + '/api/v2' + path,
                        json: true,
                        headers: {
                            referer: REFERER
                        },
                        qs: {
                            username: this.username,
                            password: this.password
                        }
                        /*auth: {
                            bearer: this.token.access_token
                        }*/
                    }, (err, response, result) => {
                        if (err || response.statusCode !== 200) {
                            reject(err || result);
                        } else {
                            resolve(passback === undefined ? result : {result: result, passback: passback});
                        }
                    });
                });/*
            }).catch(err => {
                winston.log('debug', 'Random error', err)
                console.error('ERROR - ' + err);
            });*/
            //console.log('d');
    }

    me() {
        return this.api('/me');
    }

    home(homeId) {
        return this.api(`/homes/${homeId}`);
    }

    zones(homeId) {
        return this.api(`/homes/${homeId}/zones`);
    }

    weather(homeId) {
        return this.api(`/homes/${homeId}/weather`);
    }

    state(homeId, zoneId) {
        //console.log('a');
        return this.api(`/homes/${homeId}/zones/${zoneId}/state`, { homeId: homeId, zoneId: zoneId });
    }
}