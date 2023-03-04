# content-client

Simple management of remote content.

## Building

Run `nx build content-client` to build the library.

## Running unit tests

Run `nx test content-client` to execute the unit tests via [Jest](https://jestjs.io).

## Description

```js
{
	id: "abc",
	title: "About"
};
```

| Operation | Function          |
| --------- | ----------------- |
| Create    | create(title)     |
| Read      | get(id)           |
| Update    | update(id, title) |
| Delete    | delete(id)        |
| List      | getAll()          |
