# Supabase MAC Isolation Instructions

This guide explains how to use the database-level filtering to isolate logging to a specific device or restore logging for all devices.

## 1. Initial Setup
If you haven't yet, run the contents of [mac_isolation.sql](./mac_isolation.sql) in your **Supabase SQL Editor**. This creates the configuration table, the filtering trigger, and the helper functions.

## 2. Isolate a Specific MAC Address
To stop logging all other devices and focus **only** on one specific MAC, run the following SQL command:

```sql
-- Replace 'E6A673847FE3' with the MAC address you want to track
-- Note: Colons are automatically handled by the trigger logic
select public.set_focused_mac('E6A673847FE3');
```

## 3. Restore Logging for All Devices
To stop filtering and resume logging every packet found by the sensors, run:

```sql
-- An empty string clears the focus filter
select public.set_focused_mac('');
```

## 4. Check Current Status
To see which MAC is currently being isolated (if any), run:

```sql
select value as focused_mac 
from public.system_config 
where key = 'focused_mac_address';
```

---

### How it Works
- **Trigger**: The code uses a `BEFORE INSERT` trigger on the `packet_reports` table.
- **Logic**: If a `focused_mac_address` is set in the `system_config` table, the trigger checks if the incoming `packet_id` contains that string. If it doesn't match, the insert is silently discarded (`RETURN NULL`).
- **Safety**: If the config value is empty or null, the trigger allows all data through.
