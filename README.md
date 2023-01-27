# Bagman JS

This is the official JS/TS client for [Bagman](https://github.com/sheunglaili/bagman)

## Getting Started 

```
npm install bagman
```

```ts
import { Bagman } from "bagman";

// initialise client
const bagman = new Bagman({ url: "<bagman-server-url>"});

// subscribe to a channel
const channel = await bagman.subscribe("<channel>");
// listen to a event in a channel
// await to make sure listen is sucessful
await channel.listen("explosion", (data) => {
    // do something with the data
});

// emit some data to the channel
// await to make sure emit is successful
await channel.emit("greetings", {
    "hello": "world"
});
```