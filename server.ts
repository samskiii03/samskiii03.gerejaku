import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Generate children Sunday School curriculum
app.post("/api/ai/generate-curriculum", async (req, res) => {
  const { className, ageRange } = req.body;

  if (!className) {
    return res.status(400).json({ error: "Kolom nama kelas wajib diisi." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment. Using rich theological Sunday School fallback curriculum generator.");
    const fallbackHTML = getFallbackCurriculum(className, ageRange || "Anak-anak");
    return res.json({ text: fallbackHTML, usingFallback: true });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `You are a professional Christian theological curriculum director for a prestigious community church.
Generate a structured Sunday School lesson/curriculum module for the class '${className}' (Target age group: ${ageRange || 'Anak-anak'}).
Crucial instructions:
1. The lesson material and topic MUST NOT contain any computers, computer programming, or software engineering-related examples, metaphors, or terms. Rely purely on classic interactive storytelling, nature/creation metaphors, family relationships, historical Biblical narratives, and character-building practices.
2. Write the syllabus in BAHASA INDONESIA, with a warm, elegant, encouraging, and highly professional tone suitable for Sunday School teachers and children's ministries.
3. Ensure the response is styled as clear Markdown, structured with:
   - **Tema Utama** (Main Theme / Title)
   - **Ayat Alkitab Acuan** (Biblical Reference)
   - **Pesan Inti Teologis** (Core Theological Message)
   - **Tujuan Pengembangan Karakter** (Character-Building Objective)
   - **Aktivitas Interaktif & Kreatif** (Practical & Creative Child-Friendly Activities, no computers)
   - **Ayat Hafalan Minggu Ini** (Suggested memory verse)
Make it beautiful, detailed, complete, and deeply professional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    return res.json({ text: responseText, usingFallback: false });

  } catch (error: any) {
    console.error("AI Generation failed:", error);
    const fallbackHTML = getFallbackCurriculum(className, ageRange || "Anak-anak");
    return res.json({ text: fallbackHTML, usingFallback: true, error: error.message });
  }
});

function getFallbackCurriculum(className: string, ageRange: string): string {
  let title = "Mengasihi Sesama Seperti Diri Sendiri";
  let bibleRef = "Lukas 10:25-37 (Kisah Orang Samaria yang Murah Hati)";
  let message = "Tuhan Yesus mengajarkan bahwa mengasihi sesama tidak memandang perbedaan suku, ras, atau status sosial. Kasih sejati ditunjukkan melalui tindakan nyata menolong orang lain yang sedang kesusahan.";
  let objective = "Mengembangkan empati anak, mendorong kemauan berbagi tanpa pamrih, serta menumbuhkan kebiasaan menolong teman di sekolah maupun di rumah.";
  let activities = `1. **Cerita Boneka Tangan**: Guru memerankan kisah Orang Samaria menggunakan boneka sederhana dari kaos kaki bekas.\n2. **Permainan 'Jembatan Kasih'**: Anak-anak bergandengan tangan membentuk lingkaran dan secara bergantian membantu teman melewati sebuah 'rintangan tali lembut'.\n3. **Menggambar Kartu Doa**: Anak merancang kartu ucapan buatan tangan dengan crayon warna, menuliskan kata penyemangat untuk diberikan kepada orang tua atau teman yang sedang lelah.`;
  let memoryVerse = "Lukas 10:27 - 'Kasihilah Tuhan, Allahmu, dengan segenap hatimu... dan kasihilah sesamamu manusia seperti dirimu sendiri.'";

  const lowerName = className.toLowerCase();
  if (lowerName.includes("toddler") || lowerName.includes("balita") || lowerName.includes("kecil") || lowerName.includes("pratama")) {
    title = "Allah Pencipta yang Agung";
    bibleRef = "Kejadian 1:1-25 (Kisah Tuhan Menciptakan Alam Semesta)";
    message = "Segala keindahan alam semesta, bintang di langit, bunga di taman, hingga hewan liar diciptakan oleh Allah yang sangat mengasihi kita. Dunia adalah taman bermain rohani yang Allah titipkan bagi kita.";
    objective = "Membangun rasa kagum dan syukur anak terhadap karya ciptaan Allah, mengajari anak merawat tanaman dan menyayangi hewan peliharaan.";
    activities = `1. **Eksplorasi Daun & Bunga**: Anak-anak berjalan di sekitar halaman gereja, mengumpulkan bentuk daun yang berbeda, lalu menempelkannya di selembar kertas putih.\n2. **Meniru Suara Hewan Ciptaan**: Permainan tebak suara hewan dengan ragaan tubuh yang ceria.\n3. **Bernyanyi Bersama**: Menyanyikan lagu 'Pelangi-Pelangi' dan 'Segala Ciptaan Allah' sambil bertepuk tangan berirama.`;
    memoryVerse = "Kejadian 1:1 - 'Pada mulanya Allah menciptakan langit dan bumi.'";
  } else if (lowerName.includes("remaja") || lowerName.includes("besar") || lowerName.includes("madya") || lowerName.includes("youth")) {
    title = "Menjaga Integritas dan Perkataan yang Baik";
    bibleRef = "Yakobus 3:1-12 (Bahaya Lidah & Kekuatan Ucapan)";
    message = "Setiap kata yang keluar dari mulut kita memiliki kekuatan untuk membangun atau menghancurkan. Seorang murid Kristus dipanggil untuk menjaga integritasnya dengan mengucapkan kebenaran dalam kasih, tanpa kepalsuan.";
    objective = "Mengajarkan kejujuran di sekolah (tidak menyontek), melatih remaja untuk berhenti melakukan perundungan (bullying) verbal, serta aktif memberi apresiasi positif.";
    activities = `1. **Diskusi Studi Kasus**: Membedakan gosip vs kebenaran dari skenario persahabatan di sekolah.\n2. **Eksperimen Pasta Gigi**: Memeras pasta gigi keluar dari tubenya dan mencoba memasukkannya kembali—sebuah visualisasi kuat bahwa kata-kata yang sudah telanjur diucapkan tidak dapat ditarik kembali.\n3. **Refleksi Jurnal Pribadi**: Menuliskan 3 ucapan syukur dan menulis surat apresiasi rahasia untuk salah satu rekan kelas.`;
    memoryVerse = "Amsal 16:24 - 'Perkataan yang menyenangkan adalah seperti sarang madu, manis bagi jiwa dan obat bagi tulang-tulang.'";
  }

  return `### 📖 KURIKULUM RESMI SEKOLAH MINGGU
*Visual Layout Terakreditasi Kantor Pusat*

---

#### 🌟 **Tema Utama:**
**${title}**

#### 📖 **Ayat Alkitab Acuan:**
*${bibleRef}*

#### ⛪ **Pesan Inti Teologis:**
${message}

#### ❤️ **Tujuan Pengembangan Karakter:**
${objective}

#### 🎨 **Aktivitas Interaktif & Kreatif (Bebas Komputer):**
${activities}

#### 📜 **Ayat Hafalan Minggu Ini:**
> **"${memoryVerse}"**

---
*Catatan Guru: Harap menyiapkan bahan fisik 15 menit sebelum jam kelas dimulai. Pastikan suasana hangat dan dipenuhi kasih Kristus.*`;
}

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
