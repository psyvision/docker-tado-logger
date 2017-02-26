/*jshint esnext: true */
/* jshint node: true */

'use strict';

var ApiClient = require('./client');
var Database = require('./database')

var database = new Database({
    host: process.env.DATABASE_HOST
});

var api = new ApiClient();

var moment = require('moment');

// Authentication via ENV variables
var auth = {
    login: process.env.TADO_LOGIN,
    password: process.env.TADO_PASSWORD
};

const logInterval = process.env.LOG_INTERVAL || 5 * 60 * 1000; /* logging interval in ms */
var homeId;
var home;
var zones;

function getZone(zoneId) {
    for (var zone of zones) {
        if (zone.id === zoneId) {
            return zone;
        }
    }
    return null;
}

/* Misc functions */

function authorize(login, pass) {
    return new Promise((resolve, reject) => {
        console.log('Authorizing:', login);

        try {
            api.login(login, pass)
                .then(result => {
                    console.log('api authorization successful');
                    resolve(true);
                })
                .catch(result => {
                    console.log('api authorization failed! ', result);
                    reject(false);
                });

        } catch (ex) {
            console.log(ex);
        }
    });
}


function tadoSetup() {
    return new Promise((resolve, reject) => {

        authorize(auth.login, auth.password)
            .then(result => {
                api.me()
                    .then(result => {
                        homeId = result.homes[0].id;

                        console.log('Home ID:', homeId);

                        Promise.all([api.home(homeId), api.zones(homeId)])
                            .then(results => {
                                home = results[0];
                                zones = results[1];

                                console.log('Zones:', results[1]);

                                resolve(true);
                            });
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }, result => {
                reject(false);
            }).catch(err => {
                console.error('Setup error');
            });
    });
}

function tadoLogger() {
    
    //api.refreshToken();

    for (var zone of zones) {
        api.state(homeId, zone.id)
            .then((result) => {

                var r = result.result;
                var p = result.passback;

                //console.log(r);
                //console.log(p);

                var z = getZone(p.zoneId);

                if (z.type === 'HEATING') {

                    console.log(r);

                    console.log('Data from: [%s]: [%s]', z.name, r.sensorDataPoints.insideTemperature.celsius);
                    
                    database.write('heating', 
                            {
                                temperature: r.sensorDataPoints.insideTemperature.celsius,
                                humidity: r.sensorDataPoints.humidity.percentage,
                                power: r.activityDataPoints.heatingPower.percentage,
                                state: r.setting.power === 'ON',
                                target: r.setting.temperature === null ? 0 : r.setting.temperature.celsius
                            },
                            {zone: z.name}
                    ).then(result => {
                        console.log('[%s] Data written to db', moment().toString());
                    })
                    .catch(err => {
                            console.log('[%s] Error writing to db: ', moment().toString(), err);
                    });
                }   else if (z.type === 'HOT_WATER') {

                    console.log('Data from: [%s]: [%s]', z.name, r.setting.power);
                    
                    database.write('water', 
                            {
                                state: r.setting.power === 'ON'
                            }
                    ).then(result => {
                        console.log('[%s] Data written to db', moment().toString());
                    })
                    .catch(err => {
                            console.log('[%s] Error writing to db: ', moment().toString(), err);
                    });
                }          

            })
            .catch(err => {
                console.error('[%s] Error reading from the thermostat: ', moment().toString(), err);
            });

    }

    setTimeout(tadoLogger, logInterval);

}

function tadoRefresh() {

    api.refreshToken()
    .catch(err => {
        
        console.log(err);
    });

    setTimeout(tadoRefresh, 2 * 60 * 1000);
}

console.log('api Login: ', process.env.TADO_LOGIN);
console.log('DB Host: ', process.env.DATABASE_HOST);
/*
    const express = require('express')
const http = require('http')
const os = require('os')

const app = express()
*/
Promise.all([database.create(), tadoSetup()])
    .then(results => {
        console.log('Logging started...');
        
        tadoLogger();
        
        tadoRefresh();
        /*http.createServer(app).listen(3000, function() {
            
        });*/
    }, results => {
        console.log('Initialization failed [%s]. Cannot start logging.', results.code);
    }).catch(reason => {
        console.log('Caught: ', reason)
    });



