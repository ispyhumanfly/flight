# flight

A web server designed for running full stack, component based applications at enterprise scale.

## Configuration

Here are the environment variables that can be set:

| Variable           | Description                             | Required | Default    |
| ------------------ | --------------------------------------- | -------- | ---------- |
| FLIGHT_MODE        | The mode to run the server in.          | No       | production |
| FLIGHT_REDIS_HOST  | The host to connect to Redis.           | No       | localhost  |
| FLIGHT_REDIS_PORT  | The port to connect to Redis.           | No       | 6379       |
| FLIGHT_DIST_PATH   | The path to the dist folder.            | No       | ../dist    |
| FLIGHT_MAX_WORKERS | The maximum number of workers to spawn. | No       |            |
