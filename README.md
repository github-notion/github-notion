# Github + Notion integration for ticket management!

## Github

`Github API`

- [x] Update `Autolinks` based on `TICKET_TYPE_FIELD` of Notion. This happens every hour.
- [x] Create `Github Webhooks` if it doesn't exists.

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

- Ticket Status
  - Env Variables: `TICKET_STATUS_FIELD`
  - Type: select
  - Example property name: Status
  - Description: This contains a list of statuses
  - IMPORTANT NOTE: Make sure all options required in env variables `TICKET_STATUSES` is available in your database!

### Other environment variables

- `DOMAIN`: Domain of your server. This will be used to update autolinks and webhooks on Github.
- `GITHUB_USERNAME` (Optional): The github account that will be used to access all API calls.
- `GITHUB_PERSONAL_ACCESS_TOKEN` (Optional): You can create a `Personal Access Token` under github personal account's settings page. You are encouraged to create a dummy account dedicated to your organization. Github recommends this approach and calls it `machine user`
- `GITHUB_ORGANIZATION` (Optional): The github organization to use this dashboard with.
- `GITHUB_MANAGED_REPOS`: List all repos this bot should manage. They should all belong to the same organization.
- `MANAGE_STATUS` (Optional, default to `false`): Whether the integration should update ticket statuses. Allowed values are: `true` | `false`
- `MANAGE_AUTOLINKS`(Optional, default to `true`): Whether the integration should update autolinks of each repo. Allowed values are: `true` | `false`
- `TICKET_TYPE_FIELD`: Refer to `Important Properties` of `Notion`
- `TICKET_ID_FIELD`: Refer to `Important Properties` of `Notion`
- `TICKET_REF_FIELD`: Refer to `Important Properties` of `Notion`
- `TICKET_STATUS_FIELD`: Refer to `Important Properties` of `Notion`
- `TICKET_STATUSES`: Pass a string that represents your statuses. `e.g. TICKET_STATUSES=To Do,Blocked,In Progress,Review,Done,Archived` Must follow same sequence as below:
  1. status for when a task is to-do
  2. status for when a task is blocked
  3. Status for when a task is in progress
  4. Status for when a task is being reviewed
  5. Status for when a task is done
  6. Status for when a task is archived
