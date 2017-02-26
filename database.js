/* jshint esnext: true */
/* jshint node: true */

'use strict';

var Influx = require('influx');

var policy = {
    name: 'Forever',
    duration: 'INF'
};

module.exports = class Database {

    constructor(options) {
        this.host = options.host || 'localhost';
        this.name = options.name || 'tado_db';

        console.log(this.name);

        this.db = new Influx.InfluxDB({
            host: this.host,
            database: this.name,
            schema: [{
                    measurement: 'heating',
                    fields: {
                        temperature: Influx.FieldType.FLOAT,
                        humidity: Influx.FieldType.FLOAT
                    },
                    tags: [
                        'zone'
                    ]
                },
                {
                    measurement: 'water',
                    fields: {
                        state: Influx.FieldType.BOOLEAN
                    },
                    tags: []
                }
            ]
        });
    }

    create() {
        return new Promise((resolve, reject) => {
            console.log('DB:Create');
            console.log(this.name);

            this.db.getDatabaseNames()
                .then(names => {

                    if (!names.includes(this.name)) {

                        this.db.createDatabase(this.name)
                            .then(() => {

                                this.db.createRetentionPolicy(policy.name, {
                                        database: this.name,
                                        duration: policy.duration,
                                        isDefault: true,
                                        replication: 1
                                    })
                                    .then(resolve(true))
                                    .catch(reject(false));

                            }, result => {
                                console.log('fail');
                                reject(result);
                            })
                            .catch(err => {
                                console.log(err);
                            })
                    }
                    else {
                        resolve(true);
                    }
                })
        });
    }

    write(measurement, fields, tags) {
        return this.db.writeMeasurement(measurement, [{
            tags: tags,
            fields: fields
        }], {
            database: this.name,
            retentionPolicy: policy.name,
            precision: 's'
        });
    }

    logHeating(zone, temperature, humidity) {
        write(
            'heating', 
            { 
                temperature: temperature, 
                humidity: humidity
            },
            {
                zone: zone
            });
    }
}