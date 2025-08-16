// один origin => без CORS
const API = window.location.origin;

async function j(u,o){const r=await fetch(u,o);if(!r.ok)throw new Error(r.status);return r.json();}

window.ehs = {
  getUser:  id => j(`${API}/user/${encodeURIComponent(id)}`),
  saveUser: data => j(`${API}/user/register`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
  }),
  recommend: (id,profile) => j(`${API}/recommend?user_id=${encodeURIComponent(id)}`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(profile)
  }),
  progress: id => j(`${API}/progress/${encodeURIComponent(id)}`),
  complete: (id,module_id,status='completed') => j(`${API}/progress/complete`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({user_id:id, module_id, status})
  }),
  importRoster: file => fetch(`${API}/import/roster`,{
    method:'POST', body:(()=>{const fd=new FormData(); fd.append('file',file); return fd;})()
  }).then(r=>r.json()),
  roleStats: () => j(`${API}/stats/roles`)
};