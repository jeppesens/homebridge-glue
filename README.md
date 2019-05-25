# homebridge-glue
### Homebridge integration for Glue smart locks

# Installation
install npm i -g homebridge-glue

# Configuration
config.json example
```
{
  ...
  "accessories": [
    ...
    {
      "accessory": "homebridge-glue.glue-lock",
      "name": "Front Door Lock", //OPTIONAL, default "Glue Lock"
      "hub-id": "38f6ab5c-ea53-11e8-9f32-f2801f1b9fd1", // OPTIONAL
      "lock-id": "432c7f7a-ea53-11e8-9f32-f2801f1b9fd1", // OPTIONAL
      "username": "myname@example.com",
      "password": "EB1K^M0zBN2vRFK6",
      "check-for-events": true, // default true
      "check-for-events-interval": 10 // default 10 seconds
    }
  ]
}

```

## Selecting Hub and Lock
If hubId or lockId is unknown it will select the first available lock of the first hub. If you only have one. It will work without configuration.


## Events
Glue have events that they list in the app. This plugin checks those events every 10 seconds and updates the status accordingly. Keep in mind that manually locking or unlocking the door doesn't trigger an event.


## Homebridge
https://github.com/nfarina/homebridge


## Glue Smart Lock
https://www.gluehome.com








**Based on work from [siavashg](https://github.com/siavashg/homebridge-glue)**