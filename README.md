# homebridge-glue
Homebridge integration for glue smart locks

config.json e.g
```
{
  ...
  "accessories": [
    ...
    {
      "accessory": "homebridge-glue.glue-lock",
      "name": "Front Door Lock",
      "hub-id": "38f6ab5c-ea53-11e8-9f32-f2801f1b9fd1",
      "lock-id": "432c7f7a-ea53-11e8-9f32-f2801f1b9fd1",
      "username": "myname@example.com",
      "password": "EB1K^M0zBN2vRFK6"
    }
  ]
}

```