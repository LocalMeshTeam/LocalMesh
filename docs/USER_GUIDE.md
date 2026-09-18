# LocalMesh Windows User Guide

## Install

Download the `.exe` installer from a LocalMesh GitHub Release and run it. Install LocalMesh on every Windows computer that should communicate. The installer bundles the desktop app and required runtime files; Bun and Node.js are only needed for development.

## Connect two computers

- Put both computers on the same private Wi-Fi or Ethernet network.
- Open LocalMesh on both computers.
- Allow LocalMesh through Windows Defender Firewall on **Private networks** if Windows prompts you.
- Wait for the other computer to appear under **Nearby devices**.
- Use **Rescan devices** if the list is not updated immediately.
- Select **Trust**, then choose **Chat**.

LocalMesh is designed for local networks. It does not use a cloud server, user account, or internet connection for messages and files.

## Firewall requirements

LocalMesh uses these fixed local-network ports:

| Port | Protocol | Purpose |
| --- | --- | --- |
| 45454 | UDP | Finds other LocalMesh devices using LAN multicast |
| 45455 | TCP | Sends messages, files, and delivery confirmations |

If Windows Firewall did not create an exception automatically, run PowerShell as Administrator and add rules for the Private profile:

```powershell
New-NetFirewallRule -DisplayName "LocalMesh Discovery UDP" -Direction Inbound -Protocol UDP -LocalPort 45454 -Profile Private -Action Allow
New-NetFirewallRule -DisplayName "LocalMesh Transport TCP" -Direction Inbound -Protocol TCP -LocalPort 45455 -Profile Private -Action Allow
```

Do not expose these ports to the Public network unless you understand the security implications. Public Wi-Fi, guest networks, VPNs, and some mobile hotspots block multicast or device-to-device traffic; LocalMesh may not discover peers there.

## Device ID and network details

**Copy device ID** copies this computer's unique LocalMesh identifier. It is useful for support or identifying a particular installation; it does not send data or change the device.

**Network details** shows the discovery and transport ports for troubleshooting. Most users do not need to change anything there.

## Received files

After a file finishes transferring, the receiver can use **Open** to open the locally stored copy or **Download** to choose a folder and save a copy with the original filename and extension. The download dialog works without internet because it copies the file from LocalMesh's local storage. The sender can go offline after the transfer has completed.

## Data and security

Messages, conversations, files, and security identity data are stored locally on each computer. Trusting a peer approves its signing key for communication. Revoke trust if a previously trusted device should no longer communicate with this installation.
