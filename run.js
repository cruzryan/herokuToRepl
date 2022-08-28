import { spawn }  from 'child_process';

let hr = spawn("node index.js",{
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true,
  })