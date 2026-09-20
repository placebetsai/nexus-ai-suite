Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\ASUS2\Documents\New OpenCode Project\RemoteEditor"

' Start server in hidden window
WshShell.Run "python -u server.py", 0, False
WScript.Sleep 3000

' Start SSH tunnel in VISIBLE window so it gets a proper TTY
WshShell.Run "cmd /c title RemoteEditor-Tunnel && ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:8080 nokey@localhost.run", 1, False

WScript.Sleep 20000

' Now write the URL
Set fso = CreateObject("Scripting.FileSystemObject")
If fso.FileExists("tunnel_url_raw.txt") Then
  Set f = fso.OpenTextFile("tunnel_url_raw.txt", 1)
  content = f.ReadAll
  f.Close
End If

' Extract URL from raw output  
For Each line In Split(content, vbCrLf)
  If InStr(line, "lhr.life") > 0 Then
    words = Split(line, " ")
    For Each w In words
      If Left(w, 8) = "https://" Then
        url = Replace(w, ".", "")
        ' Hmm this is getting too complex for VBS
      End If
    Next
  End If
Next
