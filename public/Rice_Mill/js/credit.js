document.addEventListener('DOMContentLoaded',()=> {
  const M=window.MillMate;const $=id=>document.getElementById(id);const money=M.money;function creditBills() {
    return M.getBills().filter(b=>b.paymentMethod==='Credit');
  }
  function render() {
    const bills=creditBills();const repayments=M.getRepayments();const balances=bills.map(b=>( {
      b,paid:M.repaidForBill(b.billNo),balance:M.balanceForBill(b)
    }));$('creditCustomerCount').textContent=new Set(balances.filter(x=>x.balance>0).map(x=>x.b.customer.trim().toLowerCase())).size;$('totalCredit').textContent=money(bills.reduce((s,b)=>s+Number(b.total||0),0));$('totalRepaid').textContent=money(balances.reduce((s,x)=>s+x.paid,0));$('totalOutstanding').textContent=money(balances.reduce((s,x)=>s+x.balance,0));const term=$('creditSearch').value.trim().toLowerCase();const body=$('creditRows');body.innerHTML='';const filtered=balances.filter(x=>(x.b.customer+' '+x.b.billNo).toLowerCase().includes(term));if(!filtered.length)body.innerHTML='<tr><td colspan="7" class="empty">No matching credit bills. Credit is added when a bill is saved with payment method Credit.</td></tr>';filtered.forEach(( {
      b,paid,balance
    })=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${M.escapeHtml(b.customer)}</td><td>${b.billNo}</td><td>${new Date(b.date).toLocaleDateString()}</td><td>${money(b.total)}</td><td>${money(paid)}</td><td>${money(balance)}</td><td>${balance>0?`<button class="btn small" data-pay="${M.escapeHtml(b.billNo)}" data-customer="${M.escapeHtml(b.customer)}" data-balance="${balance}">Record payment</button>`:'<span class="status paid">Settled</span>'}</td>`;body.appendChild(tr);
    });const rb=$('repaymentRows');rb.innerHTML='';if(!repayments.length)rb.innerHTML='<tr><td colspan="4" class="empty">No repayments recorded yet.</td></tr>';repayments.slice().reverse().forEach(r=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${new Date(r.date).toLocaleString()}</td><td>${M.escapeHtml(r.customer)}</td><td>${r.billNo}</td><td>${money(r.amount)}</td>`;rb.appendChild(tr);
    });
  }
   $('creditRows').addEventListener('click',e=> {
    const btn=e.target.closest('[data-pay]');if(!btn)return;const balance=Number(btn.dataset.balance);const raw=prompt(`Enter payment amount for ${btn.dataset.customer} (remaining ${money(balance)}):`);if(raw===null)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0) {
      alert('Enter an amount greater than zero.');return;
    }
    if(amount>balance+0.001) {
      alert('Payment cannot be greater than the outstanding balance.');return;
    }
    const list=M.getRepayments();list.push( {
      id:M.uid('pay'),billNo:String(btn.dataset.pay),customer:btn.dataset.customer,amount:Math.round(amount*100)/100,date:new Date().toISOString()
    });M.setRepayments(list);render();
  });$('creditSearch').addEventListener('input',render);$('creditRefresh').addEventListener('click',render);render();
});
