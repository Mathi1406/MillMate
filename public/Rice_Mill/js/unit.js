document.addEventListener('DOMContentLoaded',()=> {
  const M=window.MillMate;const $=id=>document.getElementById(id);function render() {
    const units=M.getUnits();const body=$('unitRows');body.innerHTML='';if(!units.length)body.innerHTML='<tr><td colspan="5" class="empty">No meter readings recorded.</td></tr>';units.slice().reverse().forEach(u=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${new Date(u.date).toLocaleString()}</td><td>${u.start}</td><td>${u.end}</td><td>${u.total}</td><td><button class="btn danger small" data-delete="${M.escapeHtml(u.id)}">Delete</button></td>`;body.appendChild(tr);
    });$('totalUnit').textContent=units.length?units[units.length-1].total:0;
  }
   $('saveUnitBtn').addEventListener('click',()=> {
    const startRaw=$('startUnit').value,endRaw=$('endUnit').value;const start=Number(startRaw),end=Number(endRaw);if(startRaw===''||endRaw===''||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start) {
      alert('Enter valid readings. Ending reading must be greater than or equal to starting reading.');return;
    }
    const units=M.getUnits();units.push( {
      id:M.uid('unit'),date:new Date().toISOString(),dateOnly:M.dateISO(),start,end,total:Math.round((end-start)*100)/100
    });M.setUnits(units);$('startUnit').value='';$('endUnit').value='';render();
  });$('unitRows').addEventListener('click',e=> {
    const b=e.target.closest('[data-delete]');if(!b)return;if(!confirm('Delete this meter reading?'))return;M.setUnits(M.getUnits().filter(u=>u.id!==b.dataset.delete));render();
  });render();
});
