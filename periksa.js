#!/usr/bin/env node
/*
 * Pemeriksa cepat index.html. Jalankan: node periksa.js
 *
 * Alasannya satu jenis kerusakan yang TIDAK MENAMPAKKAN DIRI. Pada 2 Okt 2026
 * satu suntingan di blok pemuat video ikut menelan tiga baris pemanggil yang
 * berada tepat di bawahnya:
 *
 *     pasangMuncul();  pasangKemajuan();  pasangAjakanLengket();
 *
 * beserta baris yang memasang kelas .masuk. Akibatnya penyingkapan 14 bagian,
 * bilah kemajuan, ajakan lengket di ponsel, dan animasi masuk judul hero mati
 * sekaligus - tetapi halamannya tetap tampil utuh, tanpa galat konsol, tanpa
 * satu pun bagian yang hilang. Tidak ada yang bisa melihatnya kecuali dengan
 * membandingkan animasinya terhadap ingatan.
 *
 * Fungsi yang ditulis tetapi tidak pernah dipanggil adalah bentuk paling murah
 * untuk menangkapnya, jadi itu yang diperiksa di sini.
 */

const fs = require('fs');
const path = require('path');

const berkas = path.join(__dirname, 'index.html');
const isi = fs.readFileSync(berkas, 'utf8');

const keluhan = [];

/*
 * Hanya ISI <script> yang diperiksa, dan komentarnya dibuang lebih dulu.
 *
 * Dua-duanya perlu. Teks halaman memakai kata Indonesia biasa yang kebetulan
 * sama dengan nama fungsi - "langkah", "pasang" - jadi mencari di seluruh
 * berkas membuat fungsi mati tampak terpakai. Dan nama fungsi sering disebut
 * di komentar yang menjelaskannya, termasuk di komentar tepat di atas
 * definisinya sendiri.
 */
const skrip = [...isi.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');

/* ---- 1. Tiap fungsi bernama harus dipakai di suatu tempat ---- */
const nama = [...skrip.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);

for (const n of new Set(nama)) {
    /*
     * Yang dihitung PENYEBUTAN, bukan pemanggilan "nama(".
     *
     * Banyak di antaranya tidak pernah dipanggil langsung melainkan diserahkan
     * sebagai rujukan - requestAnimationFrame(langkah),
     * addEventListener('scroll', jadwalkan), setInterval(maju1, 4500). Semuanya
     * terpakai, dan memeriksa tanda kurung akan mengadukan keempatnya.
     */
    const sebutan = [...skrip.matchAll(new RegExp('\\b' + n + '\\b', 'g'))].length;
    const definisi = [...skrip.matchAll(new RegExp('function\\s+' + n + '\\b', 'g'))].length;

    if (sebutan <= definisi) {
        keluhan.push('fungsi ' + n + '() ditulis tetapi tidak pernah dipakai');
    }
}

/* ---- 2. Kelas yang hanya hidup kalau skrip memasangnya ---- */
/*
 * Ketiganya dipakai di CSS untuk MENYEMBUNYIKAN sesuatu sampai skrip
 * memasangnya. Kalau pemasangnya hilang, isinya tidak hilang - cuma diam. Itu
 * sebabnya diperiksa dari dua arah: ada di CSS dan ada yang memasangnya.
 */
for (const kelas of ['masuk', 'tampak', 'muncul', 'tampil']) {
    const diCss = isi.includes('.' + kelas + ' ') || isi.includes('.' + kelas + '.')
        || isi.includes('.' + kelas + ',') || isi.includes('.' + kelas + '{')
        || isi.includes('.' + kelas + ' {');

    const dipasang = skrip.includes("classList.add('" + kelas + "')")
        || skrip.includes("classList.toggle('" + kelas + "'");

    if (diCss && !dipasang) {
        keluhan.push('kelas .' + kelas + ' dipakai di CSS tetapi tidak ada skrip yang memasangnya');
    }
}

/* ---- 3. Pemilih yang dicari skrip harus benar-benar ada di markup ---- */
/*
 * el('x') adalah getElementById. Salah ketik di sini tidak melempar galat -
 * fungsinya hanya diam-diam keluar lebih awal lewat "if (!bar) return".
 */
const idDicari = new Set([...skrip.matchAll(/\bel\('([\w-]+)'\)/g)].map(m => m[1]));

for (const id of idDicari) {
    if (!new RegExp('id="' + id + '"').test(isi)) {
        keluhan.push("skrip mencari el('" + id + "') tetapi tidak ada id itu di markup");
    }
}

if (keluhan.length) {
    console.error('GAGAL — ' + keluhan.length + ' temuan:');
    keluhan.forEach(k => console.error('  - ' + k));
    process.exit(1);
}

console.log('Lulus: ' + new Set(nama).size + ' fungsi semuanya dipanggil, '
    + idDicari.size + ' id semuanya ada, kelas yang dipasang skrip lengkap.');
