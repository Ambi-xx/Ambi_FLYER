import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Download, 
  Sparkles, 
  Loader2, 
  Scissors, 
  Trash2, 
  RotateCcw, 
  Copy, 
  Check, 
  Info, 
  Settings, 
  History, 
  Building,
  RefreshCw,
  Eye,
  Sliders,
  Type as FontIcon,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { Rnd } from "react-rnd";
import { ExtractedPropertySpecs, ObiTextConfig, GenerationHistoryItem } from "./types";
import { drawObiToCanvas } from "./lib/obiGenerator";

// Set Worker safely from unpkg CDN to ensure matching build version and prevent Vite HMR issues
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch (err) {
  console.warn("Failed to set custom PDF worker source, using default.", err);
}

export default function App() {
  // Real estate flyer states
  const [flyerImg, setFlyerImg] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [flyerFileName, setFlyerFileName] = useState<string>("");
  
  // Obi states (dynamic drawing or upload)
  const [obiMode, setObiMode] = useState<"generated" | "uploaded" | "eraser">("generated");
  const [obiImg, setObiImg] = useState<string | null>(null);
  const [uploadedObiFilename, setUploadedObiFilename] = useState<string>("");
  
  // Rnd position/dimensions in parent percentage coordinates
  const [obiRect, setObiRect] = useState({ x: 0, y: 84, width: 100, height: 16 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Obi configuration settings
  const [obiConfig, setObiConfig] = useState<ObiTextConfig>({
    companyName: "株式会社Ambitious",
    licenseNumber: "北海道知事石狩(1)第9451号",
    address: "〒063-0863 北海道札幌市西区八軒三条東４丁目１−１",
    phone: "011-600-6863",
    fax: "011-351-5312",
    contactPerson: "孫 姗姗",
    email: "sun_sun@ambitious-jp.com",
    website: "https://ambitious-jp.com",
    tagline: "誠実なサポートと豊富な選択肢で、理想の暮らしをカタチに",
    primaryColor: "#0f172a", // Slate 900
    textColor: "#ffffff",
    layoutType: "standard",
    showBorders: true,
    commission: "3%+6万円（税別）"
  });

  // API constraints & prompt
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem("user_gemini_api_key") || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  
  // Generated Copywriting output
  const [activeTab, setActiveTab] = useState<"japanese" | "chinese" | "english">("japanese");
  const [jpText, setJpText] = useState<string>("");
  const [zhText, setZhText] = useState<string>("");
  const [enText, setEnText] = useState<string>("");
  
  // Extracted specs from AI JSON schema
  const [specs, setSpecs] = useState<ExtractedPropertySpecs | null>(null);
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);

  // Clipboard copies
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  
  // Generation history (locally persistent)
  const [historyList, setHistoryList] = useState<GenerationHistoryItem[]>(() => {
    const saved = localStorage.getItem("generation_history");
    return saved ? JSON.parse(saved) : [];
  });

  const flyerFileInputRef = useRef<HTMLInputElement>(null);
  const obiFileInputRef = useRef<HTMLInputElement>(null);

  // Sync API Key to localStorage safely
  useEffect(() => {
    if (userApiKey) {
      localStorage.setItem("user_gemini_api_key", userApiKey);
    } else {
      localStorage.removeItem("user_gemini_api_key");
    }
  }, [userApiKey]);

  // Redraw generated Obi when layout preferences, company name context, or theme color changes
  useEffect(() => {
    if (obiMode === "generated") {
      try {
        const base64Png = drawObiToCanvas(obiConfig);
        setObiImg(base64Png);
      } catch (err) {
        console.error("Error generating Obi canvas:", err);
      }
    } else if (obiMode === "eraser") {
      setObiImg(null); // Pure white eraser box
    }
  }, [obiMode, obiConfig]);

  // Adjust placement preview dynamically depending on container dimension updates
  const syncContainerDimensions = () => {
    if (previewContainerRef.current) {
      setContainerSize({
        width: previewContainerRef.current.clientWidth,
        height: previewContainerRef.current.clientHeight
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(syncContainerDimensions, 150);
    window.addEventListener("resize", syncContainerDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", syncContainerDimensions);
    };
  }, [flyerImg]);

  // Quick Preset placements for speed
  const applyPresetLocation = (preset: "bottom-16" | "bottom-20" | "top-15" | "full-height") => {
    switch (preset) {
      case "bottom-16":
        setObiRect({ x: 0, y: 84, width: 100, height: 16 });
        break;
      case "bottom-20":
        setObiRect({ x: 0, y: 80, width: 100, height: 20 });
        break;
      case "top-15":
        setObiRect({ x: 0, y: 0, width: 100, height: 15 });
        break;
      case "full-height":
        setObiRect({ x: 0, y: 0, width: 100, height: 100 });
        break;
    }
  };

  // Helper function to precisely adjust position & size of the band
  const adjustObiRect = (key: 'x' | 'y' | 'width' | 'height', delta: number) => {
    setObiRect(prev => {
      let val = prev[key] + delta;
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      
      const next = { ...prev, [key]: Math.round(val * 10) / 10 };
      
      // Ensure bounds checking
      if (next.x + next.width > 100) {
        if (key === 'x') next.x = Math.max(0, 100 - next.width);
        if (key === 'width') next.width = Math.max(1, 100 - next.x);
      }
      if (next.y + next.height > 100) {
        if (key === 'y') next.y = Math.max(0, 100 - next.height);
        if (key === 'height') next.height = Math.max(1, 100 - next.y);
      }
      
      return next;
    });
  };

  // Upload actions
  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlyerFileName(file.name);
    
    if (file.type === "application/pdf") {
      setIsProcessingPdf(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Configure PDF.js for Japanese double-byte languages and embedded graphics
        const CMAP_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`;
        const STANDARD_FONTS_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;
        
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: STANDARD_FONTS_URL
        });
        
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.2 }); // High res rendering to look stunning
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        const base64Jpeg = canvas.toDataURL("image/jpeg", 0.9);
        setFlyerImg(base64Jpeg);
        applyPresetLocation("bottom-16");
      } catch (error) {
        console.error("PDF processing failure:", error);
        alert("PDF図面の取り込みに失敗しました。PDF内部の圧縮形式、またはラスタ形式がサポートされていない可能性があります。JPG/PNG形式などの画像ファイルでもお試しください。");
      } finally {
        setIsProcessingPdf(false);
      }
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFlyerImg(event.target?.result as string);
        applyPresetLocation("bottom-16");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomObiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedObiFilename(file.name);
    setObiMode("uploaded");
    const reader = new FileReader();
    reader.onload = (event) => {
      setObiImg(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Canvas Compositing to produce beautiful final JPEG brochures
  const handleDownloadComposit = async () => {
    if (!flyerImg) {
      alert("募集図面（マイソク）がアップロードされていません。最初に編集エリア左上のボタンより図面マイソクをアップロードしていただくか、「帯のみ高解像度ダウンロード」をご利用ください。");
      return;
    }
    
    try {
      const flyerImage = new Image();
      flyerImage.src = flyerImg;
      await new Promise((resolve, reject) => {
        flyerImage.onload = resolve;
        flyerImage.onerror = reject;
      });

      const compositCanvas = document.createElement("canvas");
      const ctx = compositCanvas.getContext("2d")!;

      // Keep source high flyer resolution for crisp prints
      compositCanvas.width = flyerImage.width;
      compositCanvas.height = flyerImage.height;

      // Draw original flyer
      ctx.drawImage(flyerImage, 0, 0, flyerImage.width, flyerImage.height);

      // Translate Obi percentage-based rect into coordinate systems in actual flyer dimension scale
      const dx = flyerImage.width * (obiRect.x / 100);
      const dy = flyerImage.height * (obiRect.y / 100);
      const dw = flyerImage.width * (obiRect.width / 100);
      const dh = flyerImage.height * (obiRect.height / 100);

      if (obiMode === "eraser") {
        // Clear previous stamp completely to paper-white background as an eraser
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(dx, dy, dw, dh);
      } else if (obiImg) {
        // Draw the custom generated OR custom uploaded Obi image
        const obiImage = new Image();
        obiImage.src = obiImg;
        await new Promise((resolve, reject) => {
          obiImage.onload = resolve;
          obiImage.onerror = reject;
        });
        
        ctx.drawImage(obiImage, dx, dy, dw, dh);
      } else {
        // Plain default white eraser
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(dx, dy, dw, dh);
      }

      // Generate action downloads
      const formatTime = new Date().toISOString().replace(/[:.]/g, "-");
      const downloadLink = document.createElement("a");
      downloadLink.href = compositCanvas.toDataURL("image/jpeg", 0.92);
      downloadLink.download = `Ambitious_flyer_${formatTime}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Brochure rendering issue:", err);
      alert("画像の合成、生成に失敗しました。画像が読み込み可能かご確認ください。");
    }
  };

  // Downloads ONLY the created Obi (band) at high resolution
  const handleDownloadObiOnly = (scale: number) => {
    try {
      let dataUrl = "";
      if (obiMode === "uploaded" && obiImg) {
        // If they uploaded an image, just download it directly
        dataUrl = obiImg;
      } else {
        // If a generated obi, draw high-res canvas on the fly with custom scale
        dataUrl = drawObiToCanvas(obiConfig, scale);
      }

      const formatTime = new Date().toISOString().replace(/[:.]/g, "-");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      // name file based on scale resolution
      const widthVal = 1200 * scale;
      downloadLink.download = `Ambitious_obi_${widthVal}px_${formatTime}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Obi download issue:", err);
      alert("帯のみのダウンロード処理でエラーが発生しました。");
    }
  };

  // Helper to call Gemini directly from the browser (e.g. on GitHub Pages or custom static hosts)
  const callGeminiDirectlyFromBrowser = async (base64Image: string, prompt: string) => {
    const key = userApiKey;
    if (!key) {
      throw new Error("静的サイト環境（GitHub Pages等）で動作させる場合、画面右上の「API Key」入力欄にご自身のGemini APIキーを入力していただく必要があります。APIキーはブラウザのローカルストレージにのみ保存され、外部に送信されることはありません。");
    }

    const cleanBase64 = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            specs: {
              type: "OBJECT",
              description: "Extracted real estate property specification parameters",
              properties: {
                propertyName: { type: "STRING", description: "Name of the property or building" },
                rent: { type: "STRING", description: "Rent price in Yen" },
                managementFee: { type: "STRING", description: "Management or common area fee" },
                deposit: { type: "STRING", description: "Security deposit / Shikikin" },
                keyMoney: { type: "STRING", description: "Key money / Reikin" },
                layout: { type: "STRING", description: "Property layout plan" },
                size: { type: "STRING", description: "Occupiable area square meters" },
                stationWalkTime: { type: "STRING", description: "Train station access and walking distance" },
                address: { type: "STRING", description: "Physical property address" },
                constructionYear: { type: "STRING", description: "Construction completion month/year" },
                keyFeatures: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "Array of premium highlights"
                }
              },
              required: [
                "propertyName",
                "rent",
                "managementFee",
                "deposit",
                "keyMoney",
                "layout",
                "size",
                "stationWalkTime",
                "address",
                "constructionYear",
                "keyFeatures"
              ]
            },
            japaneseCopy: { type: "STRING", description: "The complete Japanese recruitment marketing copy text" },
            chineseCopy: { type: "STRING", description: "The complete Chinese recommendation text" },
            englishCopy: { type: "STRING", description: "The complete global English marketing copy text" }
          },
          required: ["specs", "japaneseCopy", "chineseCopy", "englishCopy"]
        }
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini direct error:", errText);
      try {
        const errJson = JSON.parse(errText);
        throw new Error(errJson.error?.message || `APIエラー: ${res.status}`);
      } catch {
        throw new Error(`Google API接続エラー: ${res.status}。APIキーが有効か、またはご自身のネットワークをご確認ください。`);
      }
    }

    const resData = await res.json();
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Geminiからコンテンツを抽出できませんでした。");
    }

    return JSON.parse(rawText.trim());
  };

  const callGeminiRegenDirectlyFromBrowser = async (specsData: ExtractedPropertySpecs, prompt: string) => {
    const key = userApiKey;
    if (!key) {
      throw new Error("静的サイト環境（GitHub Pages等）で動作させる場合、画面右上の「API Key」項目にご自身のGemini APIキーを入力していただく必要があります。");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            japaneseCopy: { type: "STRING", description: "Recruitment advertisement in Japanese" },
            chineseCopy: { type: "STRING", description: "Xiaohongshu advertisement in Chinese" },
            englishCopy: { type: "STRING", description: "Listing advertisement in English" }
          },
          required: ["japaneseCopy", "chineseCopy", "englishCopy"]
        }
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini direct error:", errText);
      try {
        const errJson = JSON.parse(errText);
        throw new Error(errJson.error?.message || `APIエラー: ${res.status}`);
      } catch {
        throw new Error(`API接続エラー: ${res.status}。APIキーがお間違いないかご確認ください。`);
      }
    }

    const resData = await res.json();
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Geminiから更新コピーを抽出できませんでした。");
    }

    return JSON.parse(rawText.trim());
  };

  // AI copywriting analysis handler
  const handleAnalyzeAndGenerateAI = async () => {
    if (!flyerImg) {
      alert("マイソク（図面／PDF）をアップロードしてから実行してください。");
      return;
    }

    setIsGenerating(true);
    setJpText("");
    setZhText("");
    setEnText("");
    setSpecs(null);

    const promptText = `あなたはプロの不動産仲介エージェントであり、卓越した不動産コピーライターです。
提供された不動産マイソク（図面）の画像を詳細に分析し、以下の情報を正確に抽出してください。
また、抽出した情報をもとに、日本国内の募集サイト・中国のSNS（小紅書/Xiaohongshu）・英語圏向けSNS（Instagram/Facebook）に
最適な、それぞれのターゲット層に響く訴求力の高い紹介文（コピー）を生成してください。

【抽出にあたっての要件】
- 漢字、数値、単位を誤読しないよう慎重に判定してください（特に賃料、管理費、専有面積、徒歩分数）。
- 「敷金・礼金」の有無や「築年月」などの数値を抜き出します。
- おすすめ設備（24時間ゴミ出し、独立洗面台、浴室乾燥、ネット無料、追い焚きなど）があれば「keyFeatures」に最大8点として抽出してください。

【生成コピーの記述要件】
1. 日本語 (japaneseCopy):
   - ポータルサイトや国内SNS（Twitter/Instagram）向けの書き出し。
   - 物件情報を分かりやすく整理し、箇条書き（賃料、管理・共益費、間取り、面積、アクセス、築年）を含める。
   - 魅力的なアピールポイントを3〜4文でエモーショナルに記述。ハッシュタグを付与。

2. 中国語 (chineseCopy):
   - 小紅書 (Xiaohongshu / RED) もしくは微信朋友圈の書き方。
   - 豊かな絵文字（Emoji）を効果的に配置し、中国国籍の契約希望者が気にするポイント（駅近、採光十分、バス・トイレ別"干湿分離/干湿分离"、周囲の環境やスーパー利便性、初期費用の安さ等）をアピール。
   - ハッシュタグを付与（例: #日本房产 #东京租房 #买房 #好房推薦）。

3. 英語 (englishCopy):
   - グローバルなクライアント向けの、プロフェッショナルかつ魅力的な英語紹介文。
   - 重要な物件スペックを整理し、エリア・利便性を高らかにアピール。
   - 最後にアクション（例: "Inquire via DM for details and viewings!"）を含める。ハッシュタグを付与。

${customPrompt ? `【特別な追加の指示】\nユーザーからの追加カスタム希望です。以下の指示をコピー全体の生成に最優先で反映させてください: "${customPrompt}"` : ""}
`;

    const isStaticEnv = window.location.hostname.endsWith("github.io") || 
                        !window.location.hostname.match(/localhost|127\.0\.0\.1|run\.app/);

    try {
      let data;
      if (isStaticEnv && userApiKey) {
        console.log("GitHub/Static environment detected: Calling Gemini directly from browser...");
        data = await callGeminiDirectlyFromBrowser(flyerImg, promptText);
      } else {
        try {
          const response = await fetch("/api/analyze-flyer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flyerImg,
              customPrompt,
              userApiKey: userApiKey || undefined
            })
          });

          if (!response.ok) {
            if (response.status === 404 || response.status === 502) {
              console.warn("Express backend returned 404/502. Falling back to browser-direct API execution...");
              data = await callGeminiDirectlyFromBrowser(flyerImg, promptText);
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || `Server HTTP Error: ${response.status}`);
            }
          } else {
            data = await response.json();
          }
        } catch (fetchErr: any) {
          if (fetchErr.name === "TypeError") {
            console.warn("Backend server not found (Static host). Falling back to browser-direct API..." + fetchErr.message);
            data = await callGeminiDirectlyFromBrowser(flyerImg, promptText);
          } else {
            throw fetchErr;
          }
        }
      }

      setJpText(data.japaneseCopy || "");
      setZhText(data.chineseCopy || "");
      setEnText(data.englishCopy || "");
      setSpecs(data.specs || null);

      // Create history save item
      if (data.specs) {
        const newHistoryItem: GenerationHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
          propertyName: data.specs.propertyName || "名称未決定物件",
          aiText: data.japaneseCopy || "",
          specs: data.specs
        };
        const updatedList = [newHistoryItem, ...historyList].slice(0, 10); // Keep max 10
        setHistoryList(updatedList);
        localStorage.setItem("generation_history", JSON.stringify(updatedList));
      }
    } catch (err: any) {
      console.error("AI Generation Failure:", err);
      alert(err.message || "AI文案の生成に失敗しました。画面右上の「API Key」項目にGemini APIキーを入力して再度お確かめください。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate copy based on tweaked key specs without analyzing the image again
  const handleRegenerateFromDetails = async () => {
    if (!specs) return;

    setIsRegenerating(true);

    const regenPrompt = `あなたはプロの不動産仲介代理店のエージェントで、コピーライターです。
以下の提供された「修正後の正確な物件情報（スペック）」と「アピールポイント」をベースに、
再度、(1)日本語ポータルサイト/SNS用 (2)中国語の小紅書(Xiaohongshu)向き (3)英語グローバル顧客向けの、最も魅力的で間違いのない集客プロモーション用募集文をそれぞれ再作成してください。

【修正後の物件スペック】
- 物件名: ${specs.propertyName}
- 賃料/家賃: ${specs.rent}
- 管理費/共益費: ${specs.managementFee}
- 敷金: ${specs.deposit}
- 礼金: ${specs.keyMoney}
- 間取り: ${specs.layout}
- 広さ/専有面積: ${specs.size}
- 最寄り駅・徒歩: ${specs.stationWalkTime}
- 所在地住所: ${specs.address}
- 築年月/築年数: ${specs.constructionYear}
- 主要な設備特徴: ${specs.keyFeatures.join(", ")}

【記述ルール】
- 掲載スペック数値は他と齟齬がないよう一貫性を持って反映。
- 各言語コピーを個別に指定プロパティに格納して、キレイにフォーマットされた文章（ハッシュタグ含む）で返してください。

${customPrompt ? `【特別な追加の指示】\nユーザーによるカスタム指示条件: "${customPrompt}"` : ""}
`;

    const isStaticEnv = window.location.hostname.endsWith("github.io") || 
                        !window.location.hostname.match(/localhost|127\.0\.0\.1|run\.app/);

    try {
      let data;
      if (isStaticEnv && userApiKey) {
        console.log("GitHub/Static environment: Regenerating copy directly in browser...");
        data = await callGeminiRegenDirectlyFromBrowser(specs, regenPrompt);
      } else {
        try {
          const response = await fetch("/api/regenerate-copy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              specs,
              customPrompt,
              userApiKey: userApiKey || undefined
            })
          });

          if (!response.ok) {
            if (response.status === 404 || response.status === 502) {
              console.warn("Express backend returned 404/502. Falling back to browser-direct API execution...");
              data = await callGeminiRegenDirectlyFromBrowser(specs, regenPrompt);
            } else {
              const errJson = await response.json();
              throw new Error(errJson.error || "スペック変更に伴う再生成に失敗しました。");
            }
          } else {
            data = await response.json();
          }
        } catch (fetchErr: any) {
          if (fetchErr.name === "TypeError") {
            console.warn("Backend server not found (Static host). Falling back to browser-direct API...");
            data = await callGeminiRegenDirectlyFromBrowser(specs, regenPrompt);
          } else {
            throw fetchErr;
          }
        }
      }

      setJpText(data.japaneseCopy || "");
      setZhText(data.chineseCopy || "");
      setEnText(data.englishCopy || "");
      setIsEditingSpecs(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "再生成中にエラーが発生しました。");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Copy to clipboard helper
  const triggerCopyToClipboard = (text: string, activeTabId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTab(activeTabId);
    setTimeout(() => setCopiedTab(null), 1800);
  };

  // Quick select past item from history
  const handleSelectHistoryItem = (item: GenerationHistoryItem) => {
    setSpecs(item.specs);
    setJpText(item.aiText);
    // Best effort reload tabs, standardizing
    setZhText("");
    setEnText("");
  };

  const handleClearEverything = () => {
    if (confirm("アップロードした物件図面、帯設定、生成された文案をすべて初期化しますか？")) {
      setFlyerImg(null);
      setFlyerFileName("");
      setObiImg(null);
      setUploadedObiFilename("");
      setJpText("");
      setZhText("");
      setEnText("");
      setSpecs(null);
      setCustomPrompt("");
      if (flyerFileInputRef.current) flyerFileInputRef.current.value = "";
      if (obiFileInputRef.current) obiFileInputRef.current.value = "";
    }
  };

  // Multi-choice color theme setups
  const applyColorTheme = (primary: string, text: string) => {
    setObiConfig(prev => ({
      ...prev,
      primaryColor: primary,
      textColor: text
    }));
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-slate-800 font-sans selection:bg-emerald-600 selection:text-white">
      {/* Premium Header Decoration Lines */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-700 via-stone-300 to-amber-600"></div>

      {/* Main Professional Toolbar */}
      <header className="bg-white/95 border-b border-stone-200/80 px-6 py-3.5 sticky top-0 z-10 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Brandings */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-800 p-2.5 rounded-xl shadow-sm text-white animate-fade-in">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  REAL ESTATE ADVISORY
                </span>
                <span className="text-[10px] text-stone-400 font-mono tracking-wider">
                  V2.0
                </span>
              </div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                Ambitious 帯替え &amp; AI自動募集文生成ツール
              </h1>
            </div>
          </div>

          {/* Quick API Key panel / info */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-stone-50 hover:bg-stone-100/60 transition px-3.5 py-1.5 rounded-xl border border-stone-200 max-w-sm w-full md:w-64">
              <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap">API Key <span className="text-amber-600">*</span>:</span>
              <input 
                type="password" 
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="Secretsから自動読込中"
                className="bg-transparent border-none focus:ring-0 text-xs w-full text-stone-850 placeholder-stone-400 outline-none p-0.5"
              />
            </div>
            <button
              onClick={handleClearEverything}
              className="px-3.5 py-2 bg-stone-50 hover:bg-red-50 hover:text-red-700 border border-stone-200 hover:border-red-200 text-stone-600 rounded-xl transition-all duration-200 text-xs flex items-center gap-1.5 font-medium shadow-xs"
              title="すべてクリアして最初からやり直す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>
            <button
              onClick={() => setShowGithubModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all duration-200 text-xs flex items-center gap-1.5 font-bold shadow-xs border border-slate-900"
              title="GitHub Pagesへの公開・連携手順を表示"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              GitHub公開手順
            </button>
          </div>

        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-[95%] xl:max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* ==================== RIGHT COLUMN: IMAGE COMBINING ==================== */}
        <section className="bg-white rounded-2xl shadow-xs border border-stone-200/90 flex flex-col overflow-hidden animate-fade-in relative lg:col-span-8 xl:col-span-9 lg:order-2">
          
          <div className="p-5 border-b border-stone-150 bg-stone-50/50 flex justify-between items-center">
            <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-900">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-mono font-bold">1</span>
              帯替え・画像加工（電子消しゴム＆自社帯合成）
            </h2>
            
            <div className="flex items-center gap-1.5 bg-[#f1f0eb] rounded-lg p-0.5 border border-stone-200 text-xs text-stone-600">
              <button 
                onClick={() => setObiMode("generated")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  obiMode === "generated" 
                    ? "bg-emerald-750 text-white font-bold shadow-xs" 
                    : "hover:bg-stone-200/60"
                }`}
              >
                自社帯自動生成
              </button>
              <button 
                onClick={() => setObiMode("uploaded")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  obiMode === "uploaded" 
                    ? "bg-emerald-750 text-white font-bold shadow-xs" 
                    : "hover:bg-stone-200/60"
                }`}
              >
                帯画像アップ
              </button>
              <button 
                onClick={() => {
                  setObiMode("eraser");
                  setObiImg(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  obiMode === "eraser" 
                    ? "bg-stone-700 text-white font-bold shadow-xs" 
                    : "hover:bg-stone-200/60"
                }`}
              >
                白塗り(消去)
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-6">
            
            {/* 1. Flyer File Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Flyer upload box */}
              <div 
                onClick={() => flyerFileInputRef.current?.click()}
                className="group border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-stone-50/40 hover:bg-stone-100/60 transition-all duration-300"
              >
                <input 
                  type="file" 
                  ref={flyerFileInputRef} 
                  onChange={handleFlyerUpload} 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                />
                
                {isProcessingPdf ? (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                ) : (
                  <FileText className="w-8 h-8 text-stone-400 group-hover:text-emerald-600 group-hover:scale-105 transition-all mb-2" />
                )}
                
                <span className="text-xs font-bold text-slate-800">元図面マイソクを取り込む</span>
                <span className="text-[10px] text-stone-500 mt-1">PDF形式 或者 图像 (JPG/PNG)</span>
                {flyerFileName && (
                  <span className="text-[10px] px-2 py-0.5 mt-2 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded max-w-full truncate font-medium">
                    {flyerFileName}
                  </span>
                )}
              </div>

              {/* Obi logo/business card upload box */}
              <div 
                onClick={() => obiFileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  obiMode === "uploaded" 
                    ? "border-emerald-600 bg-emerald-50/40"
                    : "border-stone-300 hover:border-emerald-600 bg-stone-50/40 hover:bg-stone-100/60"
                }`}
              >
                <input 
                  type="file" 
                  ref={obiFileInputRef} 
                  onChange={handleCustomObiUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <ImageIcon className={`w-8 h-8 mb-2 group-hover:scale-105 transition-all ${
                  obiMode === "uploaded" ? "text-emerald-700" : "text-stone-400 group-hover:text-emerald-700"
                }`} />
                <span className="text-xs font-bold text-slate-800">自社の紹介帯（看板）を入れる</span>
                <span className="text-[10px] text-stone-500 mt-1">自社の図面用の帯画像ファイル</span>
                {uploadedObiFilename && obiMode === "uploaded" ? (
                  <span className="text-[10px] px-2 py-0.5 mt-2 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded max-w-full truncate font-medium">
                    {uploadedObiFilename}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700/80 mt-1 font-medium">
                    （無ければ自動生成、又消去で対応可）
                  </span>
                )}
              </div>

            </div>

            {/* Dynamic Obi Generator Customization options if selected */}
            {obiMode === "generated" && (
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                    <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                    自社帯の掲載情報編集 &amp; カラーカスタマイズ
                  </div>
                  <span className="text-[10px] font-bold text-stone-500">リアルタイム反映</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">宅建会社名 (最大28文字)</label>
                    <input 
                      type="text" 
                      value={obiConfig.companyName}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">免許番号</label>
                    <input 
                      type="text" 
                      value={obiConfig.licenseNumber}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">本店所在地</label>
                    <input 
                      type="text" 
                      value={obiConfig.address}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">お問合せ電話番号 (TEL)</label>
                    <input 
                      type="text" 
                      value={obiConfig.phone}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">FAX番号</label>
                    <input 
                      type="text" 
                      value={obiConfig.fax || ""}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, fax: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                   <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">担当</label>
                    <input 
                      type="text" 
                      value={obiConfig.contactPerson || ""}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, contactPerson: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">仲介手数料</label>
                    <input 
                      type="text" 
                      value={obiConfig.commission || ""}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, commission: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">メールアドレス</label>
                    <input 
                      type="text" 
                      value={obiConfig.email}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">ウェブサイト URL</label>
                    <input 
                      type="text" 
                      value={obiConfig.website}
                      onChange={(e) => setObiConfig(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border border-stone-200 hover:border-stone-300 focus:border-emerald-750 focus:bg-white text-slate-800 rounded-lg outline-none transition-all shadow-xs" 
                    />
                  </div>
                </div>

                {/* Banner branding colors */}
                <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-550">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">帯のテーマカラー:</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => applyColorTheme("#0f172a", "#ffffff")}
                        className="w-5 h-5 rounded-full bg-[#0f172a] border border-stone-300 cursor-pointer"
                        title="ネイビー・ホワイト"
                      />
                      <button 
                        onClick={() => applyColorTheme("#ffffff", "#1e293b")}
                        className="w-5 h-5 rounded-full bg-[#ffffff] border border-stone-350 text-slate-900 font-extrabold flex items-center justify-center text-[8px] cursor-pointer"
                        title="ホワイト"
                      >W</button>
                      <button 
                        onClick={() => applyColorTheme("#1e3a8a", "#ffffff")}
                        className="w-5 h-5 rounded-full bg-[#1e3a8a] border border-stone-300 cursor-pointer"
                        title="ロイヤルブルー"
                      />
                      <button 
                        onClick={() => applyColorTheme("#065f46", "#ffffff")}
                        className="w-5 h-5 rounded-full bg-[#065f46] border border-stone-300 cursor-pointer"
                        title="クラシックグリーン"
                      />
                      <button 
                        onClick={() => applyColorTheme("#78350f", "#fffaf0")}
                        className="w-5 h-5 rounded-full bg-[#78350f] border border-stone-300 cursor-pointer"
                        title="ウォルナットゴールド"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={obiConfig.showBorders}
                        onChange={(e) => setObiConfig(prev => ({ ...prev, showBorders: e.target.checked }))}
                        className="rounded bg-white border-stone-300 text-emerald-750 focus:ring-0"
                      />
                      <span className="font-bold text-slate-800">二重枠線を描画</span>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* Flyer Drag-and-drop Workshop Preview container */}
            {flyerImg ? (
              <div className="flex flex-col gap-4">
                
                {/* Visual alignment aids buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <div className="text-xs text-slate-900 font-extrabold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-700" />
                    帯の自動配置テンプレート
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button 
                      onClick={() => applyPresetLocation("bottom-16")}
                      className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-slate-800 rounded-lg border border-stone-200 shadow-xs transition cursor-pointer font-bold"
                    >
                      下部 16% (標準帯)
                    </button>
                    <button 
                      onClick={() => applyPresetLocation("bottom-20")}
                      className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-slate-800 rounded-lg border border-stone-200 shadow-xs transition cursor-pointer font-bold"
                    >
                      下部 20% (太帯)
                    </button>
                    <button 
                      onClick={() => applyPresetLocation("top-15")}
                      className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-slate-800 rounded-lg border border-stone-200 shadow-xs transition cursor-pointer font-bold"
                    >
                      上部 15% (ヘッダー用)
                    </button>
                    <button 
                      onClick={() => applyPresetLocation("full-height")}
                      className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-slate-850 rounded-lg border border-stone-200 shadow-xs transition cursor-pointer font-bold"
                    >
                      全体 (画像確認用)
                    </button>
                  </div>
                </div>

                {/* Subtitle guidance */}
                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                  <p className="text-[11px] text-emerald-950 leading-relaxed font-sans">
                    💡 <b>操作方法:</b> 下部のプレビュー上で緑の枠線（帯）を<b>直接ドラッグ＆リサイズ</b>するか、下記の<b>位置調整コントローラー (スライダー＆1クリック単位ボタン)</b> を使用して、隙間なく完璧に位置合わせを行えます。
                  </p>
                </div>

                {/* Silk-smooth Precision Alignment Controller Panel */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                      📐 帯の位置・サイズ微調整 (0.1%単位でミリ調整可能)
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-850 border border-emerald-205 font-mono px-2 py-0.5 rounded-full font-bold">
                      X: {obiRect.x.toFixed(1)}% | Y: {obiRect.y.toFixed(1)}% | 幅: {obiRect.width.toFixed(1)}% | 高: {obiRect.height.toFixed(1)}%
                    </span>
                  </div>

                  {/* 4 Multi-sliders for absolute silky movement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                    {/* Y Position */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-700 font-bold">↕️ 上下位置 (Y座標)</span>
                        <span className="font-mono text-stone-550 font-bold">{obiRect.y.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustObiRect("y", -1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="上へ1%移動"
                        >
                          ▲
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={(100 - obiRect.height).toFixed(1)}
                          step="0.1"
                          value={obiRect.y}
                          onChange={(e) => setObiRect(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                          className="flex-1 accent-emerald-700 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <button
                          onClick={() => adjustObiRect("y", 1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="下へ1%移動"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* X Position */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-700 font-bold">↔️ 左右位置 (X座標)</span>
                        <span className="font-mono text-stone-550 font-bold">{obiRect.x.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustObiRect("x", -1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="左へ1%移動"
                        >
                          ◀
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={(100 - obiRect.width).toFixed(1)}
                          step="0.1"
                          value={obiRect.x}
                          onChange={(e) => setObiRect(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                          className="flex-1 accent-emerald-700 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <button
                          onClick={() => adjustObiRect("x", 1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="右へ1%移動"
                        >
                          ▶
                        </button>
                      </div>
                    </div>

                    {/* Height Size */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-700 font-bold">🛡️ 帯の高さ (縦幅)</span>
                        <span className="font-mono text-stone-550 font-bold">{obiRect.height.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustObiRect("height", -1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="高さを1%縮める"
                        >
                          －
                        </button>
                        <input
                          type="range"
                          min="1"
                          max={(100 - obiRect.y).toFixed(1)}
                          step="0.1"
                          value={obiRect.height}
                          onChange={(e) => setObiRect(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
                          className="flex-1 accent-emerald-700 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <button
                          onClick={() => adjustObiRect("height", 1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="高さを1%広げる"
                        >
                          ＋
                        </button>
                      </div>
                    </div>

                    {/* Width Size */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-700 font-bold">📐 帯の横幅 (横幅)</span>
                        <span className="font-mono text-stone-550 font-bold">{obiRect.width.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustObiRect("width", -1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="横幅を1%縮める"
                        >
                          －
                        </button>
                        <input
                          type="range"
                          min="1"
                          max={(100 - obiRect.x).toFixed(1)}
                          step="0.1"
                          value={obiRect.width}
                          onChange={(e) => setObiRect(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
                          className="flex-1 accent-emerald-700 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <button
                          onClick={() => adjustObiRect("width", 1)}
                          className="w-7 h-7 bg-white hover:bg-stone-100 active:bg-emerald-50 text-stone-850 rounded border border-stone-200 text-center font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="横幅を1%広げる"
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Micro Shift Keyboard-like helpers */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200 items-center justify-between text-[11px]">
                    <span className="text-stone-550 font-semibold text-[10px] sm:text-[11px]">🔍 0.1%単位微調整（各スライダーの横のボタンもご活用いただけます）</span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => adjustObiRect("y", -0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="上へ微小移動"
                      >
                        微上(▲)
                      </button>
                      <button
                        onClick={() => adjustObiRect("y", 0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="下へ微小移動"
                      >
                        微下(▼)
                      </button>
                      <button
                        onClick={() => adjustObiRect("height", -0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="高さを微小縮小"
                      >
                        高微縮(－)
                      </button>
                      <button
                        onClick={() => adjustObiRect("height", 0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="高さを微小拡大"
                      >
                        高微伸(＋)
                      </button>
                      <button
                        onClick={() => adjustObiRect("x", -0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="左へ微小移動"
                      >
                        微左(◀)
                      </button>
                      <button
                        onClick={() => adjustObiRect("x", 0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="右へ微小移動"
                      >
                        微右(▶)
                      </button>
                      <button
                        onClick={() => adjustObiRect("width", -0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="横幅を微小縮小"
                      >
                        幅微縮(－)
                      </button>
                      <button
                        onClick={() => adjustObiRect("width", 0.1)}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 active:scale-95 text-[10px] cursor-pointer shadow-xs font-bold"
                        title="横幅を微小拡大"
                      >
                        幅微伸(＋)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Interactive Rnd Stage */}
                <div 
                  className="blueprint-grid rounded-xl border border-stone-250 p-3 bg-[#ebeae0]/40 flex items-center justify-center overflow-auto max-h-[900px] xl:max-h-[1000px] shadow-inner"
                >
                  <div 
                    ref={previewContainerRef}
                    className="relative max-w-full h-auto shadow-md overflow-hidden cursor-crosshair border border-stone-200"
                    style={{ width: "100%", display: "inline-block" }}
                  >
                    {/* Raw flyer in back */}
                    <img 
                      src={flyerImg} 
                      alt="Flyer render stage" 
                      className="w-full h-auto block select-none pointer-events-none" 
                    />
                    
                    {/* Draggable & resizable Rnd Box */}
                    {containerSize.width > 0 && (
                      <Rnd
                        bounds="parent"
                        position={{
                          x: (obiRect.x / 100) * containerSize.width,
                          y: (obiRect.y / 100) * containerSize.height
                        }}
                        size={{
                          width: `${obiRect.width}%`,
                          height: `${obiRect.height}%`
                        }}
                        onDragStop={(e, data) => {
                          setObiRect(prev => ({ 
                            ...prev, 
                            x: (data.x / containerSize.width) * 100, 
                            y: (data.y / containerSize.height) * 100 
                          }));
                        }}
                        onResizeStop={(e, direction, ref, delta, position) => {
                          setObiRect({
                            x: (position.x / containerSize.width) * 100,
                            y: (position.y / containerSize.height) * 100,
                            width: (ref.offsetWidth / containerSize.width) * 100,
                            height: (ref.offsetHeight / containerSize.height) * 100
                          });
                        }}
                        className="border-2 border-emerald-600 bg-emerald-500/10 shadow-lg flex items-center justify-center overflow-hidden cursor-move group"
                        enableResizing={{
                          top: true, right: true, bottom: true, left: true,
                          topLeft: true, topRight: true, bottomLeft: true, bottomRight: true
                        }}
                      >
                        {obiMode === "eraser" ? (
                          <div className="w-full h-full bg-white flex flex-col items-center justify-center opacity-95">
                            <span className="text-[10px] font-bold text-slate-800 tracking-tight flex items-center gap-1">
                              <Scissors className="w-3 h-3 text-red-600" /> Electronic Eraser (白塗り消去)
                            </span>
                          </div>
                        ) : obiImg ? (
                          <img src={obiImg} alt="Obi stamp" className="w-full h-full object-fill select-none pointer-events-none" />
                        ) : (
                          <div className="w-full h-full bg-white flex flex-col items-center justify-center">
                            <span className="text-[9px] font-extrabold text-emerald-800 text-center uppercase tracking-wider px-1">
                              ここに帯をスタンプ配置
                            </span>
                          </div>
                        )}

                        {/* Interactive Corners feedback */}
                        <div className="absolute top-0 left-0 w-2 h-2 bg-emerald-700 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-700 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-emerald-700 rounded-full -translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-700 rounded-full translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform"></div>
                      </Rnd>
                    )}

                  </div>
                </div>

                {/* Action button to compile composition */}

              </div>
            ) : (
              <div className="flex-1 min-h-[500px] border-2 border-dashed border-stone-250 hover:border-emerald-600 rounded-xl bg-stone-50/40 flex flex-col items-center justify-center text-center p-8 transition-colors">
                <div className="bg-stone-100 p-4 rounded-full mb-4 border border-stone-200/80">
                  <Upload className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="text-slate-800 font-bold mb-1 text-sm">マイソクがアップロードされていません</h3>
                <p className="text-stone-500 text-xs max-w-sm mb-4 leading-relaxed">
                  左上のボタンから物件の図面マイソク（PDFか画像）を選択すると、帯替え用編集キャンバスが自動的に展開されます。
                </p>
              </div>
            )}

            {/* Always Visible Professional Download Control Station */}
            <div className="mt-6 pt-5 border-t border-stone-200/95 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 px-1">
                <Download className="w-4 h-4 text-emerald-800" />
                💾 ダウンロード &amp; 出力オプション（いつでも保存可能）
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Button: Download Composed Flyer */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">1. 帯替え済みの募集図面（画像を合成）</span>
                    {!flyerImg && (
                      <span className="text-[9px] bg-amber-55 text-amber-900 border border-amber-200/60 px-1.5 py-0.5 rounded font-bold">図面未アップロード</span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    アップロードした図面と作成した帯を重ね合わせて、一枚のきれいな募集図面（マイソク）を出力・保存します。
                  </p>
                  <button 
                    onClick={handleDownloadComposit}
                    className="w-full font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer mt-auto bg-emerald-800 hover:bg-emerald-700 text-white"
                  >
                    <Download className={`w-4 h-4 ${flyerImg ? "animate-bounce" : ""}`} />
                    帯替え済みの募集図面をダウンロード
                  </button>
                </div>

                {/* Right Button: Download Obi Band Only at Super Resolution */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-stone-250 bg-emerald-50/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950">2. 自社帯（帯のみ・高解像度）</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded font-extrabold">高解像度PNG</span>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    他ソフト（Illustrator等）での編集や各種印刷に使える、最大3600px幅の超鮮明で高画質な帯画像です。
                  </p>
                  
                  {/* Grid of resolution choices to choose from */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() => handleDownloadObiOnly(1)}
                      className="py-2 px-3 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-stone-200 text-center font-bold text-[10.5px] rounded-lg shadow-2xs hover:border-emerald-300 transition cursor-pointer"
                      title="標準印刷サイズ 1200×240px"
                    >
                      標準印字用 (1200px)
                    </button>
                    <button
                      onClick={() => handleDownloadObiOnly(2)}
                      className="py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-center font-bold text-[10.5px] rounded-lg shadow-xs hover:shadow-md transition cursor-pointer"
                      title="極美・高精彩 2400×480px"
                    >
                      ★ 2x 超高画質 (2400px)
                    </button>
                    <button
                      onClick={() => handleDownloadObiOnly(3)}
                      className="py-2 px-3 bg-slate-950 hover:bg-slate-800 text-white text-center font-bold text-[10.5px] rounded-lg shadow-xs hover:shadow-md transition cursor-pointer col-span-2"
                      title="最大・看板印刷サイズ 3600×720px"
                    >
                      ポスター・看板級 3x (3600px)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

          {/* ==================== LEFT COLUMN: SPECIFICATION LIST & THREE-LANGUAGE COPYWRITING ==================== */}
          <section className="bg-white rounded-2xl shadow-xs border border-stone-200/90 flex flex-col p-5 md:p-6 overflow-hidden animate-fade-in relative gap-5 lg:col-span-4 xl:col-span-3 lg:order-1">
            <h2 className="text-base font-extrabold flex items-center justify-between pb-4 border-b border-stone-150 text-slate-900">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-mono font-bold">2</span>
                3ヶ国語AI広告募集文案ジェネレーター
              </div>
              {isGenerating && (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-full animate-pulse font-bold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-800" />
                  高度AI文案生成中...
                </span>
              )}
            </h2>

            {/* If specs are loaded, render spec panel */}
            {specs && (
              <div className="border border-stone-200 bg-stone-50/30 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Building className="w-4 h-4 text-emerald-700" />
                    AIが抽出したスペック一覧
                  </div>
                  
                  {isEditingSpecs ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleRegenerateFromDetails}
                        disabled={isRegenerating}
                        className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-750 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        確定して文案を再構成
                      </button>
                      <button 
                        onClick={() => setIsEditingSpecs(false)}
                        className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditingSpecs(true)}
                      className="px-2.5 py-1 bg-white hover:bg-stone-100 text-slate-800 border border-stone-200 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      手動微調整・再構成
                    </button>
                  )}
                </div>

                {isEditingSpecs ? (
                  /* Specs Interactive Form Editor */
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <label className="text-[10px] text-stone-550 font-bold block">物件名</label>
                      <input 
                        type="text" 
                        value={specs.propertyName}
                        onChange={(e) => setSpecs({ ...specs, propertyName: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">賃料・家賃</label>
                      <input 
                        type="text" 
                        value={specs.rent}
                        onChange={(e) => setSpecs({ ...specs, rent: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">管理費・共益費</label>
                      <input 
                        type="text" 
                        value={specs.managementFee}
                        onChange={(e) => setSpecs({ ...specs, managementFee: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">敷金</label>
                      <input 
                        type="text" 
                        value={specs.deposit}
                        onChange={(e) => setSpecs({ ...specs, deposit: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">礼金</label>
                      <input 
                        type="text" 
                        value={specs.keyMoney}
                        onChange={(e) => setSpecs({ ...specs, keyMoney: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">間取り</label>
                      <input 
                        type="text" 
                        value={specs.layout}
                        onChange={(e) => setSpecs({ ...specs, layout: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">専有面積</label>
                      <input 
                        type="text" 
                        value={specs.size}
                        onChange={(e) => setSpecs({ ...specs, size: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-stone-550 font-bold block">アクセス最寄り交通</label>
                      <input 
                        type="text" 
                        value={specs.stationWalkTime}
                        onChange={(e) => setSpecs({ ...specs, stationWalkTime: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">物件所在地（大体の住所）</label>
                      <input 
                        type="text" 
                        value={specs.address}
                        onChange={(e) => setSpecs({ ...specs, address: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-550 font-bold block">築年月</label>
                      <input 
                        type="text" 
                        value={specs.constructionYear}
                        onChange={(e) => setSpecs({ ...specs, constructionYear: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] text-stone-550 font-bold block mb-0.5">主要な設備特徴（最大8個。半角カンマで区切る）</label>
                      <input 
                        type="text" 
                        value={specs.keyFeatures.join(",")}
                        onChange={(e) => setSpecs({ ...specs, keyFeatures: e.target.value.split(",") })}
                        className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-900 text-xs focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 outline-none" 
                      />
                    </div>
                  </div>
                ) : (
                  /* Plain Grid Display of specs if matching */
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">物件名:</span>
                      <span className="font-bold text-slate-850 text-[11px]">{specs.propertyName || "図面参照"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">賃料/家賃:</span>
                      <span className="font-bold text-slate-850">{specs.rent || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">管理費/共益費:</span>
                      <span className="font-bold text-slate-850">{specs.managementFee || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">敷金 / 礼金:</span>
                      <span className="font-medium text-slate-850">{specs.deposit || "-"} / {specs.keyMoney || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">間取り:</span>
                      <span className="font-bold text-emerald-800">{specs.layout || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">専有面積:</span>
                      <span className="font-medium text-slate-850">{specs.size || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">築年数:</span>
                      <span className="font-medium text-slate-850">{specs.constructionYear || "-"}</span>
                    </div>
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-stone-250 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">交通アクセス:</span>
                      <span className="font-medium text-slate-850 text-[11px] truncate block" title={specs.stationWalkTime}>
                        {specs.stationWalkTime || "-"}
                      </span>
                    </div>
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-stone-250 shadow-xs">
                      <span className="text-[10px] text-stone-500 font-bold block">物件所在地:</span>
                      <span className="font-medium text-slate-850 text-[11px] truncate block" title={specs.address}>
                        {specs.address || "-"}
                      </span>
                    </div>

                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-stone-500 font-bold animate-fade-in">おすすめ設備：</span>
                      {specs.keyFeatures.filter(Boolean).map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-bold">
                          {f.trim()}
                        </span>
                      ))}
                      {(!specs.keyFeatures || specs.keyFeatures.length === 0) && (
                        <span className="text-[10px] text-stone-500">（なし）</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Copywriting Output Panel */}
            <div className="flex-1 flex flex-col min-h-[380px]">
              
              {jpText || zhText || enText ? (
                <div className="flex flex-col flex-1 gap-3.5">
                  
                  {/* Language Tab toggles */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center bg-stone-100/80 border border-stone-200 rounded-xl p-1.5 shadow-xs">
                    <div className="flex flex-wrap gap-1 text-xs">
                      <button 
                        onClick={() => setActiveTab("japanese")}
                        className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          activeTab === "japanese" 
                            ? "bg-white text-stone-900 border border-stone-350 shadow-xs scale-[1.02]" 
                            : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        🇯🇵 日本語ポータル用
                      </button>
                      <button 
                        onClick={() => setActiveTab("chinese")}
                        className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          activeTab === "chinese" 
                            ? "bg-white text-stone-900 border border-stone-350 shadow-xs scale-[1.02]" 
                            : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        🇨🇳 中文 小紅書・微信
                      </button>
                      <button 
                        onClick={() => setActiveTab("english")}
                        className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          activeTab === "english" 
                            ? "bg-white text-stone-900 border border-stone-350 shadow-xs scale-[1.02]" 
                            : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        🇺🇸 English Global
                      </button>
                    </div>

                    {/* Copy to clipboard */}
                    <button 
                      onClick={() => {
                        const targetText = activeTab === "japanese" ? jpText : activeTab === "chinese" ? zhText : enText;
                        triggerCopyToClipboard(targetText, activeTab);
                      }}
                      className="text-xs px-3.5 py-2 bg-emerald-800 hover:bg-emerald-750 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedTab === activeTab ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>コピー完了!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>クリップボードにコピー</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Core Text output area */}
                  <div className="flex-1 min-h-[300px] flex flex-col relative bg-[#faf9f6]/40 rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                    <textarea 
                      readOnly
                      value={activeTab === "japanese" ? jpText : activeTab === "chinese" ? zhText : enText}
                      className="w-full flex-1 p-4 bg-transparent border-none text-stone-850 text-xs focus:ring-0 leading-relaxed font-sans resize-none h-full outline-none"
                      style={{ whiteSpace: "pre-wrap" }}
                      placeholder="募集文をここに生成します..."
                    />
                  </div>

                </div>
              ) : (
                /* Static guidance info panel */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-stone-50/40 rounded-xl border border-stone-250 shadow-xs">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-full mb-4 animate-bounce">
                    <Sparkles className="w-8 h-8 text-emerald-800" />
                  </div>
                  <h3 className="text-stone-900 font-extrabold mb-2 text-sm">3ヶ国語AIリアルタイム文案生成エンジン</h3>
                  <p className="text-stone-600 text-xs max-w-sm leading-relaxed mb-4">
                    元図面マイソクをアップロードした後、上記の「生成する」ボタンを押すと、AIが図面上のあらゆる日本語漢字・数字を高度OCR解析します。数秒で賃料・アクセスなどの正確なスペック情報を自動抽出し、国籍別に最適化されたマルチ広告文を書き上げます。
                  </p>
                  
                  {/* Quick features summary lists */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-md text-[10px] text-stone-600 pt-3 border-t border-stone-200">
                    <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-xs">
                      🔍 <b>日本語:</b> SUUMO/ポータル等向け。箇条書き付きで論理的。
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-xs">
                      🐼 <b>中文:</b> RED(小紅書)/朋友圈向け。絵文字と刺さるキーワード。
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-xs">
                      🌏 <b>英語:</b> インスタ、外国人向け。魅力的でプロ仕様。
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Generation History Sidebar */}
            {historyList.length > 0 && (
              <div className="mt-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200 shadow-xs">
                <div className="text-xs font-bold text-stone-850 flex items-center gap-1.5 mb-2 font-sans">
                  <History className="w-3.5 h-3.5 text-emerald-800" />
                  最近解析した物件の履歴（最大10件保持）
                </div>
                <div className="flex flex-wrap gap-2">
                  {historyList.map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className="px-3 py-1.5 text-[10px] font-bold bg-white hover:bg-stone-100 active:bg-stone-50 text-stone-800 rounded-lg border border-stone-200 transition-all flex items-center gap-1 shadow-xs cursor-pointer animate-fade-in"
                    >
                      <Building className="w-3 h-3 text-emerald-700" />
                      {item.propertyName} ({item.timestamp})
                    </button>
                  ))}
                </div>
              </div>
            )}

          </section>

      </main>

      {/* GitHub Pages Deployment Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-850 bg-gradient-to-r from-indigo-950 to-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/15 p-2 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">GitHub Pagesでの公開・連携ガイド</h3>
                  <p className="text-[10px] text-indigo-300/80">作成した帯替え＆AI文案ツールを全世界に「無料」で公開する手順</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGithubModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs font-bold font-sans"
              >
                ✕
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 text-xs text-slate-300 space-y-5 leading-relaxed overflow-y-auto">
              <div className="bg-blue-950/40 border border-blue-500/20 p-4 rounded-xl">
                <span className="font-bold text-blue-400 flex items-center gap-1 mb-1">
                  💡 すでに自動デプロイ設定を搭載済みです！
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  このプロジェクトには、GitHub Actionsを連携するための設定ファイル（<code>.github/workflows/deploy.yml</code>）およびパス解決用の設定（<code>vite.config.ts</code>の相対パス定義）がすでに組み込み済みです。以下の4ステップを行うだけで、自動的にGitHub Pages上で完全無料・高速で公開用ウェブサイトが構築されます。
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">プロジェクトのソースフォルダをダウンロード</h4>
                    <p className="text-slate-400 text-[11px]">
                      AI Studio画面左上の「設定（Settings / 歯車アイコン）」をクリックし、<b>「ZIP出力（Export ZIP）」</b>をクリックしてコード一式をパソコンにダウンロード（またはGitHubへ直接共有）します。
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">GitHubでリポジトリを作成してプッシュする</h4>
                    <p className="text-slate-400 text-[11px]">
                      GitHubにサインインし、新しいリポジトリ（例: <code>ambitious-obi</code>）を <b>Public（公開）</b> 設定で作成します。<br />
                      先ほどのZIPファイルを解凍し、その中のすべてのファイル（<code>.github</code>フォルダ、<code>package.json</code>等も含めて丸ごと）を新しいリポジトリにプッシュするか、GitHub画面上のエクスプローラーにドラッグ＆ドロップで追加します。
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center shrink-0">3</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs mb-1">GitHub Pages を有効化（重要・Actionsへの切り替え）</h4>
                    <p className="text-slate-400 text-[11px] mb-2">
                      作成したGitHubリポジトリの <b>「Settings」タブ ➔ 「Pages」</b> メニューを開きます。<br />
                      <b>「Build and deployment」➔ 「Source」</b>を、デフォルトの「Deploy from a branch」から <b>「GitHub Actions」</b> に切り替えます。<br />
                      <span className="text-emerald-400 font-semibold">※ これを忘れると、ワークフロー（GitHub Actions）で「Get Pages site failed」や「HttpError: Not Found」というエラーが出て処理がストップします。</span>
                    </p>
                    {/* Error solution highlight box */}
                    <div className="p-2.5 bg-red-950/30 border border-red-500/20 rounded-lg text-[10.5px] text-red-300">
                      <strong className="text-red-400">🚨 添付画像のエラー（Get Pages site failed / Not Found）の解消法：</strong><br />
                      リポジトリの <b>Settings ➔ Pages ➔ Source を「GitHub Actions」に切り替えてから</b>、GitHubの「Actions」タブを開き、失敗したワークフローを選択して <b>「Re-run all jobs」</b>（すべてのジョブを再実行）をクリックしてください。正常にビルド・公開が完了します！
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold flex items-center justify-center shrink-0">4</div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">公開されたリンクでのセキュアな使い方</h4>
                    <p className="text-slate-400 text-[11px]">
                      公開されたURLのアドレスに誰もがブラウザからアクセスできます。
                      サーバーを持たない静的（SPA）公開なので管理コストはゼロです。<br />
                      AI機能を利用する際は、<b>画面右上にある「API Key」入力項目にご自身のGemini APIキーを入力</b>して使用します。キーは外部サーバーを介さずブラウザ内のセキュアな<code>localStorage</code>にのみ暗号のように保存されるため、安全に稼働します。
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2 text-slate-400 text-[11px]">
                <span className="text-amber-400 mt-0.5 font-bold">💡 メンテナンス：</span>
                <div>
                  将来的なデザイン微調整やプログラム変更が必要な場合、GitHubのファイルを直接書き換えてコミット（プッシュ）するだけで、同様に自動デプロイが自動トリガーされ数秒でアクセス先サイトがピカピカにアップデートされます！
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-850 bg-slate-950/60 flex justify-end gap-2 text-slate-350">
              <button
                onClick={() => setShowGithubModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all text-xs"
              >
                手順を確認しました (閉じる)
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 py-8 bg-[#090d16] border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026-2027 Ambitious 株式会社 - 不動産イノベーション支援ツール.</p>
          <div className="flex gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Powered by Gemini-3.5-Flash
            </span>
            <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
