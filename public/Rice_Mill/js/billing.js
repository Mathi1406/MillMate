document.addEventListener('DOMContentLoaded',()=> {

   const M=window.MillMate; let cart=[]; let savedBillNo=null; let savedBill=null;
   const $=id=>document.getElementById(id); const money=M.money;
   function nextBillNo() {
    const bills=M.getBills();return Math.max(1000,...bills.map(b=>Number(b.billNo)||0))+1;
  }
   function populateProducts() {
    const select=$('product');select.innerHTML='';M.getProducts().forEach(p=> {
      const o=document.createElement('option');o.value=p.id;o.textContent=M.productLabel(p.name);o.dataset.price=p.price;select.appendChild(o);
    });setPrice();
  }
   function setPrice() {
    const p=M.getProducts().find(x=>x.id===$('product').value);$('price').value=p?Number(p.price):'';
  }
   function render() {
    const tbody=$('billItems');tbody.innerHTML='';if(!cart.length) {
      tbody.innerHTML='<tr><td colspan="6" class="empty">No items added yet.</td></tr>';
    }
    cart.forEach((item,i)=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${i+1}</td><td>${M.escapeHtml(item.name)}</td><td>${money(item.price)}</td><td>${item.quantity}</td><td>${money(item.total)}</td><td class="no-print"><button class="btn danger small" data-remove="${i}">Remove</button></td>`;tbody.appendChild(tr);
    });const total=cart.reduce((s,x)=>s+x.total,0);$('subtotal').textContent=money(total);$('grandTotal').textContent=money(total);$('billNumber').textContent=savedBillNo||nextBillNo();$('billDate').textContent=new Date().toLocaleString();
  }
   function addItem() {
    const p=M.getProducts().find(x=>x.id===$('product').value);const price=Number($('price').value);const quantity=Number($('quantity').value);if(!p) {
      alert('Please add a product first.');return;
    }
    if(!Number.isFinite(price)||price<0||!Number.isFinite(quantity)||quantity<=0) {
      alert('Enter a valid price and quantity greater than zero.');return;
    }
    cart.push( {
      productId:p.id,name:p.name,price,quantity,total:Math.round(price*quantity*100)/100
    });$('quantity').value='';render();
  }
   function clearForm() {
    cart=[];savedBillNo=null;savedBill=null;$('customerName').value='';$('paymentMethod').value='Cash';$('billMessage').hidden=true;render();
  }
   function saveBill() {
    const customer=$('customerName').value.trim();if(!customer) {
      alert('Enter customer name.');$('customerName').focus();return;
    }
    if(!cart.length) {
      alert('Add at least one item before saving.');return;
    }
    const bills=M.getBills();const billNo=nextBillNo();const total=Math.round(cart.reduce((s,x)=>s+x.total,0)*100)/100;const bill= {
      id:M.uid('bill'),billNo,customer,paymentMethod:$('paymentMethod').value,items:cart.map(x=>( {
        ...x
      })),total,date:new Date().toISOString(),dateOnly:M.dateISO(),status:$('paymentMethod').value==='Credit'?'Credit':'Paid'
    };bills.push(bill);M.setBills(bills);savedBillNo=billNo;savedBill=bill;$('billMessage').hidden=false;$('billMessage').textContent=`Bill #${billNo} saved. ${bill.paymentMethod==='Credit'?'It is now visible on the Credit page.':'Payment recorded as '+bill.paymentMethod+'.'}`;render();
  }
   function loadShopSettings(){const s=M.getShopSettings();$('shopName').value=s.name||'';$('shopAddress').value=s.address||'';$('shopPhone').value=s.phone||'';$('shopGst').value=s.gst||'';$('shopFooter').value=s.footer||'Thank you! Visit again.';}
   function saveShopSettings(){M.setShopSettings({name:$('shopName').value.trim(),address:$('shopAddress').value.trim(),phone:$('shopPhone').value.trim(),gst:$('shopGst').value.trim(),footer:$('shopFooter').value.trim()||'Thank you! Visit again.'});$('shopSettingsMessage').textContent='Shop details saved.';}
   function buildReceipt(b){if(!b)return;const s=M.getShopSettings();const esc=M.escapeHtml;const rows=(b.items||[]).map((it,i)=>`<tr><td>${i+1}. ${esc(it.name)}</td><td>${it.quantity}</td><td>${money(it.price)}</td><td>${money(it.total)}</td></tr>`).join('');$('printReceipt').innerHTML=`<div class="receipt-head"><h1>${esc(s.name||'Shop Name')}</h1>${s.address?`<div>${esc(s.address).replace(/\n/g,'<br>')}</div>`:''}${s.phone?`<div>Phone: ${esc(s.phone)}</div>`:''}${s.gst?`<div>GSTIN: ${esc(s.gst)}</div>`:''}<strong>SHOP BILL</strong></div><div class="receipt-meta"><span>Bill No: <b>${esc(b.billNo)}</b></span><span>Date: ${new Date(b.date).toLocaleString()}</span></div><div class="receipt-meta"><span>Customer: <b>${esc(b.customer)}</b></span><span>Payment: ${esc(b.paymentMethod)}</span></div><table class="receipt-table"><thead><tr><th>Particulars</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="receipt-total">Grand Total: ${money(b.total)}</div><div class="receipt-footer">${esc(s.footer||'Thank you! Visit again.')}</div>`;}
   $('saveShopSettings').addEventListener('click',saveShopSettings);$('product').addEventListener('change',setPrice);$('addItemBtn').addEventListener('click',addItem);$('saveBillBtn').addEventListener('click',saveBill);$('clearBillBtn').addEventListener('click',clearForm);$('printBillBtn').addEventListener('click',()=> {
    if(!savedBillNo) {
      alert('Save the bill before printing.');return;
    }
    buildReceipt(savedBill||M.getBills().find(b=>Number(b.billNo)===Number(savedBillNo)));window.print();
  });$('billItems').addEventListener('click',e=> {
    const b=e.target.closest('[data-remove]');if(b) {
      cart.splice(Number(b.dataset.remove),1);render();
    }

  });loadShopSettings();populateProducts();render();

});
