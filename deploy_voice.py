#!/usr/bin/env python3
"""Deploy voice chat files to VPS and rebuild frontend."""
import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

VPS = '161.35.110.36'
PORT = 2324
USER = 'lycosh'
PASS = 'LycosH2026'

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS, port=PORT, username=USER, password=PASS, look_for_keys=False, allow_agent=False)
    return ssh

def upload(sftp, local, remote):
    with open(local, 'rb') as f:
        content = f.read()
    with sftp.file(remote, 'wb') as rf:
        rf.write(content)
    print(f"  Uploaded {os.path.basename(local)} -> {remote}")

def run(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def main():
    print("=== Deploying Voice Chat files ===")
    ssh = get_ssh()
    sftp = ssh.open_sftp()

    base = '/home/lycosh/letempsdedieu/src'
    local_base = os.path.dirname(os.path.abspath(__file__))

    files = [
        ('useVoiceChat.ts', f'{base}/hooks/useVoiceChat.ts'),
        ('VoiceButton.tsx', f'{base}/components/VoiceButton.tsx'),
    ]

    run(ssh, f'mkdir -p {base}/hooks {base}/components')

    for local_name, remote_path in files:
        local_path = os.path.join(local_base, local_name)
        if os.path.exists(local_path):
            upload(sftp, local_path, remote_path)
        else:
            print(f"  SKIP {local_name} (not found)")

    sftp.close()

    print("\n=== Building frontend ===")
    rc, out, err = run(ssh, 'cd /home/lycosh/letempsdedieu && npm run build 2>&1 | tail -20', timeout=120)
    print(out)
    if err:
        print(err)

    if rc == 0:
        print("\n=== Restarting service ===")
        rc2, out2, _ = run(ssh, 'cd /home/lycosh/letempsdedieu && docker compose restart 2>&1 || pm2 restart letempsdedieu 2>&1 || systemctl restart letempsdedieu 2>&1')
        print(out2)
        print("\n=== DONE - Voice chat deployed! ===")
    else:
        print("\n=== BUILD FAILED ===")

    ssh.close()

if __name__ == '__main__':
    main()
