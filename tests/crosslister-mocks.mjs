// Mock sell pages that copy each shop's real field labels (checked 2026-09-27
// from public help pages/screenshots; the live forms need a logged-in account).
const wrap = (body, extraHead = "") => `<!doctype html><html><head><meta charset="utf-8">${extraHead}</head><body>
<form onsubmit="return false" style="max-width:560px;margin:30px auto;font-family:sans-serif">${body}</form>
<script>window.__submitted=false;document.querySelectorAll('button[type=submit]').forEach(b=>b.onclick=()=>window.__submitted=true)</script></body></html>`;

export const MOCKS = {
  // Depop: no title field at all; photos first, then description and price.
  "https://www.depop.com/products/create/": wrap(`
    <label>Photos<input type="file" accept="image/*" multiple style="display:none" id="ph"></label>
    <label for="d">Description</label><textarea id="d" name="description" placeholder="e.g. small grey Nike t-shirt, only worn a few times"></textarea>
    <label for="br">Brand</label><input id="br" name="brand">
    <label for="sz">Size</label><input id="sz" name="size">
    <label for="pr">Item price</label><input id="pr" name="price" inputmode="decimal">
    <button type="submit">Post listing</button>`),
  // Poshmark: Original Price must NOT be filled, Listing Price must.
  "https://poshmark.com/create-listing": wrap(`
    <input type="file" accept="image/jpeg,image/png" multiple hidden>
    <div><h4>Title</h4><input placeholder="What are you selling? (required)" data-vv-name="title"></div>
    <div><h4>Description</h4><textarea placeholder="Describe it! (required)" data-vv-name="description"></textarea></div>
    <div><h4>Brand</h4><input placeholder="Enter the Brand/Designer"></div>
    <div><h4>Original Price</h4><input placeholder="Original Price" data-vv-name="originalPrice"></div>
    <div><h4>Listing Price</h4><input placeholder="Listing Price (required)" data-vv-name="listingPrice"></div>
    <div><input type="search" placeholder="Search Poshmark"></div>
    <button type="submit">Next</button>`),
  // Mercari: real React controlled inputs — the value must survive a re-render.
  "https://www.mercari.com/sell/": `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script></head><body><div id="root"></div>
<script>
const e = React.createElement;
function App(){
  const [t,setT]=React.useState(""),[d,setD]=React.useState(""),[p,setP]=React.useState(""),[tick,setTick]=React.useState(0);
  React.useEffect(()=>{const i=setInterval(()=>setTick(x=>x+1),300);return()=>clearInterval(i)},[]);
  window.__state={t,d,p};
  return e("form",{onSubmit:ev=>ev.preventDefault()},
    e("input",{type:"file",accept:"image/*",multiple:true,style:{display:"none"},"data-testid":"PhotoInput"}),
    e("label",{htmlFor:"t"},"Title"), e("input",{id:"t","data-testid":"Title",value:t,onChange:ev=>setT(ev.target.value),placeholder:"What are you selling?"}),
    e("label",{htmlFor:"d"},"Description"), e("textarea",{id:"d","data-testid":"Description",value:d,onChange:ev=>setD(ev.target.value)}),
    e("label",{htmlFor:"p"},"Price"), e("input",{id:"p","data-testid":"Price",value:p,onChange:ev=>setP(ev.target.value),inputMode:"numeric"}),
    e("span",null,"render "+tick), e("button",{type:"submit"},"List"));
}
ReactDOM.createRoot(document.getElementById("root")).render(e(App));
</script></body></html>`,
  // eBay: description lives in an iframe rich-text editor.
  "https://www.ebay.com/sl/sell": wrap(`
    <input type="file" accept="image/*" multiple style="opacity:0;position:absolute">
    <label for="t">Item title</label><input id="t" name="title" maxlength="80">
    <div><span class="label">Item description</span><iframe id="rte" src="https://www.ebay.com/rte-frame" style="width:100%;height:120px"></iframe></div>
    <label for="p">Item price</label><input id="p" name="price" aria-label="Item price">
    <label for="c">Color</label><input id="c" name="color">
    <button type="submit">List it</button>`),
  "https://www.ebay.com/rte-frame": `<!doctype html><html><body contenteditable="true"></body></html>`,
  "https://www.vinted.com/items/new": wrap(`
    <input type="file" accept="image/*" multiple hidden>
    <label for="t">Title</label><input id="t" data-testid="title--input" placeholder="e.g. White COS Jumper">
    <label for="d">Describe your item</label><textarea id="d" data-testid="description--input" placeholder="e.g. only worn a few times, true to size"></textarea>
    <label for="p">Price</label><input id="p" data-testid="price-input--input" placeholder="$0.00">
    <button type="submit">Upload</button>`),
  "https://www.grailed.com/sell/new": wrap(`
    <input type="file" accept="image/*" multiple hidden>
    <label for="dz">Designer</label><input id="dz" name="designer">
    <label for="n">Item name</label><input id="n" name="title">
    <label for="c">Color</label><input id="c" name="color">
    <label for="d">Description</label><textarea id="d" name="description" placeholder="Add details about condition, how the garment fits"></textarea>
    <label for="p">Price</label><input id="p" name="price" placeholder="$">
    <button type="submit">Publish</button>`),
};
