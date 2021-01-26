# homebridge-glue
### Homebridge integration for Glue smart locks
Based on Glues new API *Jan 2021*.
---
# Installation
install `npm i -g homebridge-glue`

---

### Setup
Getting an API key is recommended because then you don't have to have username and password in the config.
```sh
# get an api key
curl --request POST 'https://user-api.gluehome.com/v1/api-keys' \
--header 'Content-Type: application/json' \
-u my_email@example.com:my_password \
--data-raw '{
    "name": "Homebridge Glue Key",
    "scopes": ["events.read", "locks.read", "locks.write"]
}'

# And copy the apiKey property for config

```
---

### Configuration
`config.json` example
```json
{
  ...
  "accessories": [
    ...
    {
      "accessory": "homebridge-glue.glue-lock",
      "name": "Front Door Lock", //OPTIONAL, default "Glue Lock"
      "lock-id": "432c7f7a-ea53-11e8-9f32-f2801f1b9fd1", // OPTIONAL
      "username": "myname@example.com", // OPTIONAL, see below for more info
      "password": "EB1K^M0zBN2vRFK6", // OPTIONAL, see below for more info
      "api-key": "the api key from curl" // OPTIONAL
    }
  ]
}

```

## Selecting Lock
If `lock-id` is undefined it will select the first available lock. If you only have one lock it will work without configuration. I you have more than one, please check the logs for the available lock ids.

---

## Events
Glue have events that. This plugin checks those events every 5 seconds and updates the status accordingly.

Keep in mind that manually locking or unlocking the **the normal** Glue lock doesn't trigger an event unless you have the Pro version.

---

## Good to know

If you do not use an api key this plugin will create and attempt to manage those keys for you instead. So it will create API keys with name `homebridge-glue key` and when restarting Homebridge it will delete all old keys with name `homebridge-glue key`.

A side effect of this is that you can only have **ONE** lock with this plugin if you opt for username and password solution!

---

## Homebridge
https://github.com/nfarina/homebridge


---

## Glue Smart Lock
https://www.gluehome.com
