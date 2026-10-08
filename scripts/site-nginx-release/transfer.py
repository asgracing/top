"""Development-PC delivery through the mandatory shared, capped VPS transport."""
from pathlib import Path
import re
import subprocess
import sys

WORKSPACE = Path(__file__).resolve().parents[3]
HOST = 'root@200.165.229.139'
SSH_OPTIONS = ['-i', 'C:/Users/Andrew/.ssh/id_ed25519', '-o', 'IdentitiesOnly=yes',
               '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes']

def scp_command(archive):
    archive = Path(archive).resolve()
    if not re.fullmatch(r'site-redirects-\d{8}-r\d+\.tar\.gz', archive.name):
        raise ValueError('Unexpected website release filename')
    if not archive.is_relative_to(WORKSPACE / 'tmp'):
        raise ValueError('Release must be prepared in workspace tmp')
    return ['scp', '-l', '18000', *SSH_OPTIONS, str(archive), HOST + ':/tmp/' + archive.name]

def upload(archive):
    sys.path.insert(0, str(WORKSPACE / 'asg-stats-server/server'))
    from vps_transfer import vps_transfer_slot
    with vps_transfer_slot():
        subprocess.run(scp_command(archive), check=True, timeout=180)

if __name__ == '__main__':
    upload(sys.argv[1])
