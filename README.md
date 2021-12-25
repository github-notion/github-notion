# Github + Notion integration for ticket management!

## Important!

To use this for ticket management, you must have few properties in your database, you can name them however you like, just update environment variables accordingly and make sure the types are correct:

### Important Properties

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
