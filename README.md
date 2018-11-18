# homebridge-glue
### Homebridge integration for Glue smart locks

# Installation
intall npm i -g https://github.com/nilssontobias/homebridge-glue.git

# Configuration
config.json e.g
```
{
  ...
  "accessories": [
    ...
    {
      "accessory": "homebridge-glue.glue-lock",
      "name": "Front Door Lock", //OPTIONAL, will be Glue Lock if not set here
      "hub-id": "38f6ab5c-ea53-11e8-9f32-f2801f1b9fd1", //OPTIONAL, will select the first available hub
      "lock-id": "432c7f7a-ea53-11e8-9f32-f2801f1b9fd1", //OPTIONAL, will select the first available lock (of the first hub)
      "username": "myname@example.com",
      "password": "EB1K^M0zBN2vRFK6"
    }
  ]
}

```





## Homebridge
https://github.com/nfarina/homebridge


## Glue Smart Lock
https://www.gluehome.com


### Based on work from https://github.com/siavashg/homebridge-glue