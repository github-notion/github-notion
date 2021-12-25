# Github + Notion integration for ticket management!

## Github

`Github API`

- [ ] Check whether `Autolinks` feature is enabled on Github, if so, update `Autolinks` based on `TICKET_TYPE_FIELD` of Notion. This happens every hour.

`Github Webhooks`
For each events, this integration will append a new block to the ticket's page content with relevant url. If env variables `MANAGE_STATUS` is set to `true`, each event will update task status if task is found in commit message.

- [ ] `push commit`: Status -> `In Progress`
- [ ] `pull request opened`: Status -> draft ? `In Progress` : `Review`
- [ ] `pull request closed`: Status -> merged ? `Done` : Ignore

## Notion

- [x] Poll notion database every minute for new tickets and update each tickets with new ID
- [x] Find and redirect to notion page based on short, readable ticket reference. This will allow easy Github `Autolinks` configuration. (e.g. https://your-hosting.com/notion/ticket/`FEAT-123`)

### Important Properties

To use this for ticket management, you must have few properties in your Notion database, you can name them however you like, just update environment variables accordingly and make sure the types are correct:

- Ticket Type

  - Env Variables: `TICKET_TYPE_FIELD`
  - Type: select
  - Example property name: Tags
  - Description: This field contains all possible tags in your database.
  - IMPORTANT NOTE: If you ever need to change ticket type of a ticket, make sure you empty `Ticket ID` field to avoid conflicting Ticket Reference.

- Ticket ID

  - Env Variables: `TICKET_ID_FIELD`
  - Type: number
  - Example property name: ID
  - Description: This field contains a number that represents ID of the ticket.
  - IMPORTANT NOTE: Leave this blank when you create a ticket, and this service will generate an ID for you. Never update this field manually!

- Ticket Reference
  - Env Variables: `TICKET_REF_FIELD`
  - Type: formula (Formula must be: `TICKET_TYPE_FIELD`-`TICKET_ID_FIELD` (e.g. FEAT-1))
  - Example property name: TicketID
  - Description: This field is used to link github commit/PR to the notion page
