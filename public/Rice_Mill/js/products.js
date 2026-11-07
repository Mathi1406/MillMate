document.addEventListener('DOMContentLoaded',()=> {
  const M=window.MillMate;const $=id=>document.getElementById(id);function render() {
    const rows=$('productRows');rows.innerHTML='';M.getProducts().forEach(p=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${M.escapeHtml(p.name)}</td><td>${M.money(p.price)}</td><td><button class="btn secondary small" data-edit="${M.escapeHtml(p.id)}">Edit</button> <button class="btn danger small" data-delete="${M.escapeHtml(p.id)}">Delete</button></td>`;rows.appendChild(tr);
    });if(!rows.children.length)rows.innerHTML='<tr><td colspan="3" class="empty">No products. Add a product above.</td></tr>';
  }
   $('saveProductBtn').addEventListener('click',()=> {
    const name=$('productName').value.trim();const price=Number($('productPrice').value);if(!name||$('productPrice').value===''||!Number.isFinite(price)||price<0) {
      alert('Enter a product name and a valid non-negative price.');return;
    }
    const products=M.getProducts();const editId=$('saveProductBtn').dataset.edit;if(editId) {
      const p=products.find(x=>x.id===editId);if(p) {
        p.name=name;p.price=price;
      }

    }
    else {
      if(products.some(p=>p.name.toLowerCase()===name.toLowerCase())) {
        alert('A product with this name already exists.');return;
      }
      products.push( {
        id:M.uid('prod'),name,price
      });
    }
    M.setProducts(products);$('productName').value='';$('productPrice').value='';$('saveProductBtn').textContent='Save product';delete $('saveProductBtn').dataset.edit;render();
  });
   $('productRows').addEventListener('click',e=> {
    const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');const products=M.getProducts();if(edit) {
      const p=products.find(x=>x.id===edit.dataset.edit);if(!p)return;$('productName').value=p.name;$('productPrice').value=p.price;$('saveProductBtn').textContent='Update product';$('saveProductBtn').dataset.edit=p.id;
    }
    if(del) {
      if(!confirm('Delete this product from the product list? Existing saved bills will remain unchanged.'))return;M.setProducts(products.filter(p=>p.id!==del.dataset.delete));render();
    }

  });$('resetProductsBtn').addEventListener('click',()=> {
    if(!confirm('Restore the generic sample products? Your existing bills will not be deleted.'))return;M.setProducts([{id:'p1',name:'Rice grinding',price:2},{id:'p2',name:'Ragi grinding',price:8},{id:'p3',name:'Wheat grinding',price:10},{id:'p4',name:'Corn grinding',price:5},{id:'p5',name:'Millet grinding',price:6},{id:'p6',name:'Spice grinding',price:20}]);render();
  });render();
});
