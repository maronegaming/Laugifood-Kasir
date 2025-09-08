import React, { useEffect, useMemo, useRef, useState } from "react";

// =============================
// Kasir LAUGIFOOD — Single-file React App
// Fitur:
// 1) Manajemen Produk (tambah, edit, hapus, stok, gambar, kategori, harga jual & modal)
// 2) Keranjang & Transaksi (diskon per item & total, pajak, pembayaran, kembalian, cetak struk)
// 3) Ringkasan Penjualan (harian, mingguan, bulanan) + Laba Bersih
// 4) localStorage (offline, tanpa server)
// =============================

// ---------- Helpers ----------
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const currency = (n) => (isNaN(n) ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n));

const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const todayISO = () => new Date().toISOString();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d) => {
  const day = d.getDay(); // 0 Minggu
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // mulai Senin
  return new Date(d.setDate(diff));
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// ---------- Data Shapes ----------
// Product: { id, name, category, price, cost, stock, imageDataUrl }
// CartItem: { id, productId, name, price, cost, qty, discountPct, note }
// Transaction: {
//   id, timestamp, items: CartItem[],
//   subtotal, itemDiscountTotal, orderDiscountType: 'none'|'pct'|'amt', orderDiscountValue,
//   orderDiscountTotal, taxableBase, taxPct, taxAmount, grandTotal, paid, change,
// }

// ---------- App ----------
export default function App() {
  const [activeTab, setActiveTab] = useState("pos");

  const [products, setProducts] = useState(() => loadLS("lf_products", []));
  const [transactions, setTransactions] = useState(() => loadLS("lf_transactions", []));
  const [settings, setSettings] = useState(() => loadLS("lf_settings", {
    taxPct: 10,
    currency: "IDR",
    shopName: "Kasir LAUGIFOOD",
    shopAddress: "",
    receiptFooter: "Terima kasih!",
    paymentMethods: ["Tunai", "QRIS", "Transfer", "E-Wallet"],
  }));

  useEffect(() => saveLS("lf_products", products), [products]);
  useEffect(() => saveLS("lf_transactions", transactions), [transactions]);
  useEffect(() => saveLS("lf_settings", settings), [settings]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header settings={settings} />
      <div className="container mx-auto p-4">
        <Tabs active={activeTab} onChange={setActiveTab} />
        {activeTab === "products" && (
          <ProductsPage products={products} setProducts={setProducts} />
        )}
        {activeTab === "pos" && (
          <POSPage
            products={products}
            setProducts={setProducts}
            transactions={transactions}
            setTransactions={setTransactions}
            settings={settings}
          />
        )}
        {activeTab === "reports" && (
          <ReportsPage transactions={transactions} settings={settings} />
        )}
        {activeTab === "settings" && (
          <SettingsPage settings={settings} setSettings={setSettings} />
        )}
      </div>
    </div>
  );
}

function Header({ settings }) {
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{settings.shopName}</h1>
        <span className="text-sm text-gray-500">Offline · localStorage</span>
      </div>
    </header>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    { key: "pos", label: "POS / Kasir" },
    { key: "products", label: "Produk" },
    { key: "reports", label: "Ringkasan" },
    { key: "settings", label: "Pengaturan" },
  ];
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded-2xl border shadow-sm text-sm transition ${
            active === t.key ? "bg-black text-white" : "bg-white hover:bg-gray-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Products Page ----------
function ProductsPage({ products, setProducts }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Semua");
  const [editing, setEditing] = useState(null); // product or null

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["Semua", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchQ = p.name.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "Semua" || p.category === category;
      return matchQ && matchCat;
    });
  }, [products, q, category]);

  function upsertProduct(prod) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      if (exists) return prev.map((p) => (p.id === prod.id ? prod : p));
      return [prod, ...prev];
    });
    setEditing(null);
  }
  function deleteProduct(id) {
    if (!confirm("Hapus produk ini?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <ProductForm key={editing?.id || "new"} onSubmit={upsertProduct} initial={editing} />
      </div>
      <div className="lg:col-span-2">
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk..."
            className="px-3 py-2 border rounded-xl w-64 bg-white"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded-xl bg-white">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-3">
              <div className="aspect-video w-full bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {p.imageDataUrl ? (
                  <img src={p.imageDataUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm">Tanpa gambar</span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  <p className="text-xs text-gray-500">Kategori: {p.category || "-"}</p>
                </div>
                <span className="text-sm font-semibold">{currency(p.price)}</span>
              </div>
              <div className="text-xs text-gray-500">Stok: {p.stock}</div>
              <div className="text-xs text-gray-500">Modal: {currency(p.cost)}</div>
              <div className="flex gap-2 mt-1">
                <button className="px-3 py-1 text-sm border rounded-xl" onClick={() => setEditing(p)}>Edit</button>
                <button className="px-3 py-1 text-sm border rounded-xl" onClick={() => deleteProduct(p.id)}>Hapus</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500">Belum ada produk. Tambahkan di formulir kiri.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [price, setPrice] = useState(initial?.price || 0);
  const [cost, setCost] = useState(initial?.cost || 0);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [imageDataUrl, setImageDataUrl] = useState(initial?.imageDataUrl || "");

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  }

  function submit(e) {
    e.preventDefault();
    if (!name) return alert("Nama produk wajib diisi");
    if (price < 0 || cost < 0 || stock < 0) return alert("Nilai tidak boleh negatif");
    const prod = {
      id: initial?.id || uid(),
      name,
      category,
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      imageDataUrl,
    };
    onSubmit(prod);
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
      <h2 className="font-semibold">{initial ? "Edit Produk" : "Tambah Produk"}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm col-span-2">
          Nama
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          Kategori
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="text-sm">
          Harga Jual (Rp)
          <input type="number" className="mt-1 w-full border rounded-xl px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="text-sm">
          Harga Modal (Rp)
          <input type="number" className="mt-1 w-full border rounded-xl px-3 py-2" value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
        <label className="text-sm">
          Stok
          <input type="number" className="mt-1 w-full border rounded-xl px-3 py-2" value={stock} onChange={(e) => setStock(e.target.value)} />
        </label>
        <label className="text-sm col-span-2">
          Gambar Produk
          <input type="file" accept="image/*" className="mt-1 w-full border rounded-xl px-3 py-2" onChange={handleImage} />
          {imageDataUrl && (
            <div className="mt-2 aspect-video bg-gray-100 rounded-xl overflow-hidden">
              <img src={imageDataUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </label>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-xl bg-black text-white" type="submit">{initial ? "Simpan Perubahan" : "Tambah"}</button>
      </div>
    </form>
  );
}

// ---------- POS Page ----------
function POSPage({ products, setProducts, transactions, setTransactions, settings }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState([]); // CartItem[]
  const [orderDiscountType, setOrderDiscountType] = useState("none"); // none | pct | amt
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [taxPct, setTaxPct] = useState(settings.taxPct ?? 10);
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethods?.[0] || "Tunai");
  const [paid, setPaid] = useState(0);

  // Add product to cart
  function addToCart(prod) {
    setCart((prev) => {
      const exists = prev.find((i) => i.productId === prod.id);
      if (exists) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        {
          id: uid(),
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          cost: prod.cost,
          qty: 1,
          discountPct: 0,
          note: "",
        },
        ...prev,
      ];
    });
  }

  function updateItem(id, patch) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }
  function clearCart() {
    if (!confirm("Kosongkan keranjang?")) return;
    setCart([]);
    setPaid(0);
    setOrderDiscountType("none");
    setOrderDiscountValue(0);
  }

  // Filtered products
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["Semua", ...Array.from(set)];
  }, [products]);
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchQ = p.name.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "Semua" || p.category === category;
      return matchQ && matchCat;
    });
  }, [products, q, category]);

  // Calculations
  const calc = useMemo(() => {
    const itemRows = cart.map((i) => {
      const gross = i.price * i.qty;
      const disc = Math.round((gross * (i.discountPct || 0)) / 100);
      const net = gross - disc;
      const cogs = i.cost * i.qty; // HPP
      const profit = net - cogs;
      return { ...i, gross, disc, net, cogs, profit };
    });

    const subtotal = itemRows.reduce((a, b) => a + b.net, 0);

    let orderDiscountTotal = 0;
    if (orderDiscountType === "pct") orderDiscountTotal = Math.round((subtotal * Number(orderDiscountValue || 0)) / 100);
    if (orderDiscountType === "amt") orderDiscountTotal = Math.round(Number(orderDiscountValue || 0));
    if (orderDiscountType === "none") orderDiscountTotal = 0;

    const taxableBase = Math.max(0, subtotal - orderDiscountTotal);
    const taxAmount = Math.round((taxableBase * Number(taxPct || 0)) / 100);
    const grandTotal = Math.max(0, taxableBase + taxAmount);

    // Distribute orderDiscount across items to compute profit fairly
    let distributedProfit = 0;
    const totalNetBeforeOrderDisc = itemRows.reduce((a, b) => a + b.net, 0) || 1;
    for (const row of itemRows) {
      const share = Math.round((orderDiscountTotal * row.net) / totalNetBeforeOrderDisc);
      const rowProfit = (row.net - share) - row.cogs;
      distributedProfit += rowProfit;
    }

    return { itemRows, subtotal, orderDiscountTotal, taxableBase, taxAmount, grandTotal, distributedProfit };
  }, [cart, orderDiscountType, orderDiscountValue, taxPct]);

  const change = Math.max(0, Number(paid || 0) - calc.grandTotal);

  // Checkout
  const receiptRef = useRef(null);
  function printReceipt() {
    const w = window.open("", "_blank");
    const html = receiptRef.current?.innerHTML || "";
    w.document.write(`<html><head><title>Struk</title><style>
      *{font-family:ui-monospace,Menlo,Consolas,monospace}
      body{padding:12px}
      table{width:100%;border-collapse:collapse}
      td,th{font-size:12px;padding:4px 0}
      .right{text-align:right}
      .center{text-align:center}
      .muted{color:#666}
      hr{border:none;border-top:1px dashed #999;margin:8px 0}
    </style></head><body>` + html + `</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  function checkout() {
    if (calc.itemRows.length === 0) return alert("Keranjang kosong");
    if (paid < calc.grandTotal) return alert("Nominal bayar kurang dari total");
    // Update stock
    const insufficient = [];
    const nextProducts = products.map((p) => {
      const item = cart.find((i) => i.productId === p.id);
      if (!item) return p;
      const newStock = (p.stock ?? 0) - item.qty;
      if (newStock < 0) insufficient.push(p.name);
      return { ...p, stock: Math.max(0, newStock) };
    });
    if (insufficient.length) {
      if (!confirm(`Stok tidak cukup untuk: ${insufficient.join(", ")}. Lanjutkan?`)) return;
    }

    setProducts(nextProducts);

    const tx = {
      id: uid(),
      timestamp: todayISO(),
      items: calc.itemRows.map(({ id, productId, name, price, cost, qty, discountPct }) => ({ id, productId, name, price, cost, qty, discountPct })),
      subtotal: calc.subtotal,
      itemDiscountTotal: calc.itemRows.reduce((a, b) => a + b.disc, 0),
      orderDiscountType,
      orderDiscountValue: Number(orderDiscountValue || 0),
      orderDiscountTotal: calc.orderDiscountTotal,
      taxableBase: calc.taxableBase,
      taxPct: Number(taxPct || 0),
      taxAmount: calc.taxAmount,
      grandTotal: calc.grandTotal,
      paid: Number(paid || 0),
      change: change,
      paymentMethod,
      profit: calc.distributedProfit,
    };

    setTransactions((prev) => [tx, ...prev]);

    // Reset cart
    setCart([]);
    setPaid(0);
    setOrderDiscountType("none");
    setOrderDiscountValue(0);

    // Cetak struk
    setTimeout(() => {
      printReceipt();
    }, 50);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Katalog */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk..." className="px-3 py-2 border rounded-xl w-64" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded-xl">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 && <div className="text-sm text-gray-500">Produk tidak ditemukan.</div>}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left bg-gray-50 hover:bg-gray-100 border rounded-2xl overflow-hidden">
              <div className="aspect-video bg-white">
                {p.imageDataUrl ? (
                  <img src={p.imageDataUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Tanpa gambar</div>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold leading-tight">{p.name}</div>
                <div className="text-xs text-gray-500">Stok: {p.stock ?? 0} · {p.category || '-'}</div>
                <div className="text-sm font-semibold">{currency(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keranjang */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Keranjang</h2>
        <div className="flex flex-col gap-3 max-h-[55vh] overflow-auto pr-1">
          {cart.map((i) => (
            <div key={i.id} className="border rounded-xl p-2">
              <div className="flex justify-between gap-2 text-sm">
                <div className="font-medium">{i.name}</div>
                <button className="text-xs text-red-500" onClick={() => removeItem(i.id)}>hapus</button>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-sm items-center">
                <label className="col-span-2">
                  Harga
                  <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1" value={i.price}
                    onChange={(e) => updateItem(i.id, { price: Number(e.target.value||0) })} />
                </label>
                <label>
                  Qty
                  <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1" value={i.qty}
                    onChange={(e) => updateItem(i.id, { qty: Math.max(1, Number(e.target.value||1)) })} />
                </label>
                <label>
                  Disc %
                  <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1" value={i.discountPct}
                    onChange={(e) => updateItem(i.id, { discountPct: Math.max(0, Number(e.target.value||0)) })} />
                </label>
              </div>
              <div className="text-xs text-gray-600 mt-1">Subtotal: {currency(i.price * i.qty)} | Potongan: {currency(Math.round((i.price*i.qty*i.discountPct)/100))}</div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-sm text-gray-500">Belum ada item.</div>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm border-t pt-3 space-y-2">
          <div className="flex justify-between"><span>Subtotal</span><span>{currency(calc.subtotal)}</span></div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Diskon Total</span>
              <select className="border rounded-lg px-2 py-1" value={orderDiscountType} onChange={(e)=>setOrderDiscountType(e.target.value)}>
                <option value="none">Tidak ada</option>
                <option value="pct">%</option>
                <option value="amt">Rp</option>
              </select>
              {(orderDiscountType!=="none") && (
                <input className="border rounded-lg px-2 py-1 w-28" type="number" value={orderDiscountValue}
                  onChange={(e)=>setOrderDiscountValue(e.target.value)} />
              )}
            </div>
            <span className="font-medium">{currency(calc.orderDiscountTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Pajak</span>
              <input className="border rounded-lg px-2 py-1 w-16" type="number" value={taxPct} onChange={(e)=>setTaxPct(e.target.value)} />
              <span>%</span>
            </div>
            <span className="font-medium">{currency(calc.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{currency(calc.grandTotal)}</span></div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <label className="text-sm">
              Metode
              <select className="mt-1 w-full border rounded-lg px-2 py-1" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
                {settings.paymentMethods?.map((m)=> (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Bayar (Rp)
              <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1" value={paid}
                onChange={(e)=>setPaid(Number(e.target.value||0))} />
            </label>
          </div>
          <div className="flex justify-between"><span>Kembalian</span><span className="font-semibold">{currency(change)}</span></div>
          <div className="flex gap-2 pt-2">
            <button className="px-4 py-2 rounded-xl border" onClick={clearCart}>Kosongkan</button>
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={checkout}>Bayar & Cetak</button>
          </div>
        </div>

        {/* Hidden Receipt */}
        <div className="hidden">
          <Receipt ref={receiptRef} cartCalc={calc} settings={settings} paymentMethod={paymentMethod} paid={paid} change={change} />
        </div>
      </div>
    </div>
  );
}

const Receipt = React.forwardRef(function Receipt({ cartCalc, settings, paymentMethod, paid, change }, ref) {
  const now = new Date();
  return (
    <div ref={ref}>
      <div className="center">
        <div style={{fontWeight:700}}>{settings.shopName || "Kasir LAUGIFOOD"}</div>
        {settings.shopAddress && <div className="muted">{settings.shopAddress}</div>}
      </div>
      <hr />
      <table>
        <thead>
          <tr><th align="left">Item</th><th className="right">Qty</th><th className="right">Harga</th><th className="right">Subtotal</th></tr>
        </thead>
        <tbody>
          {cartCalc.itemRows.map((r)=> (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td className="right">{r.qty}</td>
              <td className="right">{currency(r.price)}</td>
              <td className="right">{currency(r.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <table>
        <tbody>
          <tr><td>Subtotal</td><td className="right">{currency(cartCalc.subtotal)}</td></tr>
          <tr><td>Diskon Pesanan</td><td className="right">{currency(cartCalc.orderDiscountTotal)}</td></tr>
          <tr><td>DPP</td><td className="right">{currency(cartCalc.taxableBase)}</td></tr>
          <tr><td>Pajak ({settings.taxPct ?? 10}%)</td><td className="right">{currency(cartCalc.taxAmount)}</td></tr>
          <tr style={{fontWeight:700}}><td>Total</td><td className="right">{currency(cartCalc.grandTotal)}</td></tr>
          <tr><td>Bayar ({paymentMethod})</td><td className="right">{currency(paid)}</td></tr>
          <tr><td>Kembalian</td><td className="right">{currency(change)}</td></tr>
        </tbody>
      </table>
      <hr />
      <div className="center muted">{now.toLocaleString("id-ID")}</div>
      {settings.receiptFooter && (<><hr /><div className="center">{settings.receiptFooter}</div></>)}
    </div>
  );
});

// ---------- Reports Page ----------
function ReportsPage({ transactions, settings }) {
  const [range, setRange] = useState("daily"); // daily | weekly | monthly

  const grouped = useMemo(() => {
    const now = new Date();
    let start;
    if (range === "daily") start = startOfDay(new Date(now));
    if (range === "weekly") start = startOfWeek(new Date(now));
    if (range === "monthly") start = startOfMonth(new Date(now));

    const rows = transactions.filter((t) => new Date(t.timestamp) >= start);

    const totals = rows.reduce((acc, t) => {
      acc.revenue += t.grandTotal;
      acc.tax += t.taxAmount;
      acc.discount += (t.itemDiscountTotal || 0) + (t.orderDiscountTotal || 0);
      acc.cogs += t.items.reduce((a, i) => a + i.cost * i.qty, 0);
      acc.profit += (t.profit || 0);
      acc.count += 1;
      return acc;
    }, { revenue: 0, tax: 0, discount: 0, cogs: 0, profit: 0, count: 0 });

    return { start, rows, totals };
  }, [transactions, range]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="font-semibold">Ringkasan Penjualan</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rentang:</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-2 border rounded-xl">
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI title="Transaksi" value={grouped.totals.count} />
        <KPI title="Pendapatan (gross)" value={currency(grouped.totals.revenue)} />
        <KPI title="Diskon" value={currency(grouped.totals.discount)} />
        <KPI title="Pajak Terkumpul" value={currency(grouped.totals.tax)} />
        <KPI title="HPP (COGS)" value={currency(grouped.totals.cogs)} />
        <KPI title="Laba Bersih" value={currency(grouped.totals.profit)} />
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Tanggal</th>
              <th>Item</th>
              <th className="text-right">Subtotal</th>
              <th className="text-right">Diskon</th>
              <th className="text-right">Pajak</th>
              <th className="text-right">Total</th>
              <th className="text-right">Laba</th>
              <th>Bayar</th>
              <th>Metode</th>
            </tr>
          </thead>
          <tbody>
            {grouped.rows.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-1">{new Date(t.timestamp).toLocaleString("id-ID")}</td>
                <td>{t.items.reduce((a,i)=>a+i.qty,0)} item</td>
                <td className="text-right">{currency(t.subtotal)}</td>
                <td className="text-right">{currency((t.itemDiscountTotal||0)+(t.orderDiscountTotal||0))}</td>
                <td className="text-right">{currency(t.taxAmount)}</td>
                <td className="text-right">{currency(t.grandTotal)}</td>
                <td className="text-right">{currency(t.profit||0)}</td>
                <td>{currency(t.paid)}</td>
                <td>{t.paymentMethod}</td>
              </tr>
            ))}
            {grouped.rows.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-500 py-4">Belum ada transaksi pada rentang ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div className="border rounded-2xl p-4 bg-gray-50">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

// ---------- Settings Page ----------
function SettingsPage({ settings, setSettings }) {
  const [form, setForm] = useState(settings);

  function save() {
    setSettings(form);
    alert("Pengaturan disimpan");
  }

  function addPaymentMethod() {
    const m = prompt("Metode pembayaran baru?");
    if (!m) return;
    setForm((f) => ({ ...f, paymentMethods: [...(f.paymentMethods||[]), m] }));
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
      <h2 className="font-semibold">Pengaturan Toko</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Nama Toko
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={form.shopName}
            onChange={(e)=>setForm({...form, shopName: e.target.value})} />
        </label>
        <label className="text-sm">
          Alamat (opsional)
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={form.shopAddress}
            onChange={(e)=>setForm({...form, shopAddress: e.target.value})} />
        </label>
        <label className="text-sm">
          Pajak Default (%)
          <input type="number" className="mt-1 w-full border rounded-xl px-3 py-2" value={form.taxPct}
            onChange={(e)=>setForm({...form, taxPct: Number(e.target.value||0)})} />
        </label>
        <label className="text-sm">
          Catatan Struk (footer)
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={form.receiptFooter}
            onChange={(e)=>setForm({...form, receiptFooter: e.target.value})} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Metode Pembayaran</div>
        <div className="flex flex-wrap gap-2 items-center">
          {(form.paymentMethods||[]).map((m, idx) => (
            <span key={idx} className="px-3 py-1 rounded-full border bg-gray-50 text-sm inline-flex items-center gap-2">
              {m}
              <button className="text-xs text-red-500" onClick={() => setForm({...form, paymentMethods: form.paymentMethods.filter((x)=>x!==m) })}>x</button>
            </span>
          ))}
          <button className="px-3 py-1 rounded-full border text-sm" onClick={addPaymentMethod}>+ Tambah</button>
        </div>
      </div>

      <div className="pt-2">
        <button onClick={save} className="px-4 py-2 rounded-xl bg-black text-white">Simpan Pengaturan</button>
      </div>

      <hr className="my-3" />
      <DangerZone />
    </div>
  );
}

function DangerZone() {
  function exportData() {
    const blob = new Blob([JSON.stringify({
      products: loadLS("lf_products", []),
      transactions: loadLS("lf_transactions", []),
      settings: loadLS("lf_settings", {}),
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `kasir-laugifood-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.products) saveLS("lf_products", data.products);
        if (data.transactions) saveLS("lf_transactions", data.transactions);
        if (data.settings) saveLS("lf_settings", data.settings);
        alert("Import berhasil. Muat ulang halaman untuk melihat perubahan.");
      } catch (err) {
        alert("File tidak valid");
      }
    };
    reader.readAsText(file);
  }
  function clearAll() {
    if (!confirm("Hapus SEMUA data (produk, transaksi, pengaturan)?")) return;
    localStorage.removeItem("lf_products");
    localStorage.removeItem("lf_transactions");
    localStorage.removeItem("lf_settings");
    alert("Data dibersihkan. Muat ulang halaman.");
  }
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
      <div className="font-semibold text-red-700">Zona Berbahaya</div>
      <div className="text-sm">Backup & pemulihan data localStorage, serta reset total.</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportData} className="px-4 py-2 rounded-xl border bg-white">Export JSON</button>
        <label className="px-4 py-2 rounded-xl border bg-white cursor-pointer">
          Import JSON
          <input type="file" accept="application/json" className="hidden" onChange={importData} />
        </label>
        <button onClick={clearAll} className="px-4 py-2 rounded-xl border bg-white">Hapus Semua</button>
      </div>
    </div>
  );
}
