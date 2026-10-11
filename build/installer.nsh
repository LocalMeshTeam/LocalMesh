!macro customInstall
  ; Limit MeshLink network access to the two fixed application ports. The
  ; active Windows profile may be Public on hotspots/VPNs.
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Discovery UDP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Transport TCP"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MeshLink Discovery UDP" dir=in action=allow protocol=UDP localport=45454 profile=any'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MeshLink Transport TCP" dir=in action=allow protocol=TCP localport=45455 profile=any'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Discovery UDP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Transport TCP"'
!macroend
