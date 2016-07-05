# docker-autoheal

Monitors docker events and restarts unhealthy containers.

The healthiness of the container is assessed through configurable healthcheck commands.

## Usage

### Start the monitor

``` sh
docker run -d -v /var/run/docker.sock:/var/run/docker.sock mcasimir/docker-autoheal
```

### Start your container

Starts your containers with some labels to enable the autoheal:

``` sh
docker run \
  -l com.github.mcasimir.autoheal.check.cmd="curl -f -I --connect-timeout 1 -X HEAD http://127.0.0.1:3000" \
  my-container-image
```

#### Monitored container label options

| label |type | default | description |
|-----|-----|-----------|-------------|
|`com.github.mcasimir.autoheal.check.grace`|`number`|`15000`|Grace period between last container start/restart and first healthcheck|
|`com.github.mcasimir.autoheal.check.frequency`|`number`|`5000`|Healthcheck frequency|
