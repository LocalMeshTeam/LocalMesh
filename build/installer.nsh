!macro customInstall
  ; Limit MeshLink network access to the two application ports on Private LANs.
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MeshLink Discovery UDP" dir=in action=allow protocol=UDP localport=45454 profile=private'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MeshLink Transport TCP" dir=in action=allow protocol=TCP localport=45455 profile=private'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Discovery UDP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MeshLink Transport TCP"'
!macroend
