# LocalMesh Backend Testing

## Automated tests

Run:

```powershell
bun run test
```

`bun run test` runs all backend tests locally, including database tests with Electron's Node runtime. For GitHub Actions or environments without Electron's native SQLite build, use `bun run test:unit`; it runs the portable protocol, security, transport, discovery, and trust tests.

## Two-computer LAN test

This verifies peer discovery, messaging, and file transfer using the desktop frontend.

### Requirements

- Two Windows computers on the same Wi-Fi or Ethernet LAN.
- Bun installed on both computers.
- The same LocalMesh code on both computers.
- Windows Firewall permission for LocalMesh on the Private network.

### Start both devices

On each computer:

```powershell
cd C:\path\to\LocalMesh
bun install
bun run dev
```

Each device must have its own Electron user-data directory and its own stored device UUID.

### Network ports

Allow these inbound ports through Windows Firewall on the Private network:

- UDP `45454` — multicast peer discovery.
- TCP `45455` — message transport.

The discovery multicast address is `239.255.42.99`.

Run these commands as Administrator if required:

```powershell
New-NetFirewallRule -DisplayName "LocalMesh Discovery UDP" -Direction Inbound -Protocol UDP -LocalPort 45454 -Profile Private -Action Allow
New-NetFirewallRule -DisplayName "LocalMesh Transport TCP" -Direction Inbound -Protocol TCP -LocalPort 45455 -Profile Private -Action Allow
```

### Expected logs

```text
LocalMesh device: COMPUTER-NAME (WINDOWS-USER)
Local IPv4 addresses: 192.168.x.x
LAN discovery listening on 239.255.42.99:45454
LAN transport listening on port 45455
```

When the other computer is found:

```text
Discovered LocalMesh peer <display name> at <ip address>
```

The current frontend exposes peer discovery, trust controls, conversations, messaging, and file transfer. Verify each action using the checklist below.

### Application checklist

- Confirm both devices appear under **Nearby devices**.
- Confirm device names and IP addresses are shown.
- Trust a peer, then open a conversation.
- Send a message and confirm it appears on both devices.
- Restart the app and confirm messages remain saved.
- Send a file and verify progress, completion, and **Open**.
- Cancel a large transfer and confirm it stops.
- Revoke peer trust and confirm the peer returns to an untrusted state.

### Troubleshooting

- Confirm both computers are on the same subnet.
- Mark the network as Private.
- Allow UDP `45454` and TCP `45455` through Windows Firewall.
- Disable VPN adapters temporarily if needed.
- Check that another application is not using these ports.
- Do not use the Vite browser URL to test Electron IPC.
