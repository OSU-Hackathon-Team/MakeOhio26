-- 1. Create a config table to hold our focused MAC
create table if not exists public.system_config (
  key text primary key,
  value text
);

-- 2. Create the filtering function in the public schema
create or replace function public.filter_packet_reports()
returns trigger as $$
declare
  focused_mac text;
begin
  -- Get the current focused MAC from config
  select value into focused_mac from public.system_config where key = 'focused_mac_address';
  
  -- If no focus is set, allow everything
  if focused_mac is null or focused_mac = '' then
    return new;
  end if;
  
  -- Check if the packet_id contains the MAC
  if new.packet_id ilike '%' || focused_mac || '%' then
    return new;
  else
    -- Silently discard other packets by returning NULL
    return null;
  end if;
end;
$$ language plpgsql;

-- 3. Create the trigger on the packet_reports table
drop trigger if exists trg_filter_packets on public.packet_reports;
create trigger trg_filter_packets
before insert on public.packet_reports
for each row execute function public.filter_packet_reports();

-- 4. Create an RPC to easily set the focus
create or replace function public.set_focused_mac(mac_addr text)
returns void as $$
begin
  insert into public.system_config (key, value)
  values ('focused_mac_address', mac_addr)
  on conflict (key) do update set value = mac_addr;
end;
$$ language plpgsql;
