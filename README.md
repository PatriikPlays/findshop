<h1 align="center"> FindShop </h1>
<p align="center">Powerful SwitchCraft service to <strong>find shops and items!</strong></p>

<p align="center">
  <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/Erb3/FindShop?style=flat-square">
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Erb3/FindShop?style=flat-square">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/Erb3/FindShop?style=flat-square">
  <img alt="GitHub Created At" src="https://img.shields.io/github/created-at/Erb3/FindShop?style=flat-square">
</p>

<hr>

FindShop is a SwitchCraft service providing an easy way to search for compatible
shops implementing the [ShopSync] protocol. Valid command aliases are `\fs` or `\findshop`.

## FAQ

### Why are shops or items missing?

There are a few reasons why your search results may not be what you expected,
such as the following.

#### The search term may be too specific or misspelled

FindShop matches results based on exact matches to an item name (display name
and item id). So, for example, if you were searching for slime blocks
(`minecraft:slime_block`):

- `slime` would be matched to both the display name ("**Slime** Block") and the
  item ID (minecraft:**slime**\_block)
- `slime_block` would be matched to the item ID (minecraft:**slime_block**)
  between "slime" and "block" and the item ID replaces this space with an
- `slimeblock` would return **NOTHING** because the display name has a space in
  underscore.

#### FindShop doesn't have the shop

FindShop fetches shop information, including location, pricing & stock, from
shops implementing the [ShopSync] standard. Shops might not appear if:

- their software doesn't support ShopSync
- their software implemented ShopSync incorrectly
- their shop hasn't been configured to use ShopSync
- their shop hasn't been loaded recently

### What softwares support ShopSync?

> [!NOTE]
> If there are others, feel free to submit a PR.

| Software                                         | Version  | ShopSync Standard (in latest version) | Note                                                |
| ------------------------------------------------ | -------- | ------------------------------------- | --------------------------------------------------- |
| [Kristify](https://github.com/Kristify/Kristify) | >=1.3.0  | 1.1                                   | Earlier versions may use an older ShopSync standard |
| [Radon](https://github.com/Allymonies/Radon)     | >=1.3.30 | 1.1                                   | Most common shop software                           |

## Subcommands

### Buy

```chat
\fs buy <item>
```

Finds shops with `<item>` and returns the shop name, location, item price &
quantity in stock. The buy keyword is optional: if no subcommand is specified,
buy is inferred.

### Sell

```chat
\fs sell <item>
```

Finds shops buying `<item>` and returns the shop name, location and item price.

### Shop Details

```chat
\fs shop <name> [page]
```

Finds shops with `<name>` and returns the owner, location, and other statistics.
If multiple results are found, a list of results with page numbers will be
shown.

### Stats

```chat
\fs stats
```

Returns some statistics.

### List

```chat
\fs list [page]
```

Lists all available shops.

## Deployment

You must use a reverse-proxy like [NginX](https://nginx.org/) or
[Casket](https://docs.casketserver.com/) to rate-limit, log and protect the API.
The IP of the user must be set to the `X-Forwarded-For` header. The proxy must
not accept any pre-existing value in the header, and should always overwrite it.

## Contributing

FindShop is developed using the [Bun toolkit and runtime](https://bun.sh).

[ShopSync]: https://p.sc3.io/7Ae4KxgzAM
