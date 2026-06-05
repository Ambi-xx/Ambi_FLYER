import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedPropertySpecs } from "../types";

// Helper to safely fetch initialized Gemini client
export function getGeminiClient(overrideApiKey?: string): GoogleGenAI {
  const apiKey = overrideApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini APIキーが設定されていません。AI StudioのSecrets設定、または環境変数をご確認ください。"
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeneratedResult {
  specs: ExtractedPropertySpecs;
  japaneseCopy: string;
  chineseCopy: string;
  englishCopy: string;
}

/**
 * Analyzes a property flyer image/pdf-page and extracts structured details
 * along with marketing copy in Japanese, Chinese, and English.
 */
export async function analyzeFlyerImage(
  base64Image: string,
  customPrompt?: string,
  overrideApiKey?: string
): Promise<GeneratedResult> {
  const ai = getGeminiClient(overrideApiKey);
  
  // Clean up dataUrl prefix if any
  const cleanBase64 = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: cleanBase64,
    },
  };

  const textInstruction = `
あなたはプロの不動産仲介エージェントであり、卓越した不動産コピーライターです。
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
   - 豊かな絵文字（Emoji）を効果的に配置し、中国国籍の契約希望者が気にするポイント（駅近、採光十分、バス・トイレ別\"干湿分离\"、周囲の環境やスーパー利便性、初期費用の安さ等）をアピール。
   - ハッシュタグを付与（例: #日本房产 #东京租房 #买房 #好房推荐）。

3. 英語 (englishCopy):
   - グローバルなクライアント向けの、プロフェッショナルかつ魅力的な英語紹介文。
   - 重要な物件スペックを整理し、エリア・利便性を高らかにアピール。
   - 最後にアクション（例: "Inquire via DM for details and viewings!"）を含める。ハッシュタグを付与。

${customPrompt ? `【特別な追加の指示】\nユーザーからの追加カスタム希望です。以下の指示をコピー全体の生成に最優先で反映させてください: "${customPrompt}"` : ""}
`;

  const textPart = {
    text: textInstruction.trim(),
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          specs: {
            type: Type.OBJECT,
            description: "Extracted real estate property specification parameters",
            properties: {
              propertyName: { type: Type.STRING, description: "Name of the property or building" },
              rent: { type: Type.STRING, description: "Rent price in Yen (e.g. 128,000円 or 12.8万円)" },
              managementFee: { type: Type.STRING, description: "Management or common area fee (e.g. 8,000円 or なし)" },
              deposit: { type: Type.STRING, description: "Security deposit / Shikikin (e.g. 1ヶ月, なし)" },
              keyMoney: { type: Type.STRING, description: "Key money / Reikin (e.g. 1ヶ月, なし)" },
              layout: { type: Type.STRING, description: "Property layout plan (e.g. 1LDK, 2DK, 1R, ワンルーム)" },
              size: { type: Type.STRING, description: "Occupiable area square meters (e.g. 35.4㎡, 25平米)" },
              stationWalkTime: { type: Type.STRING, description: "Train station access and walking distance (e.g. 東京メトロ丸ノ内線「新宿御苑前」駅 徒歩4分)" },
              address: { type: Type.STRING, description: "Physical property address (e.g. 東京都新宿区新宿１丁目)" },
              constructionYear: { type: Type.STRING, description: "Construction completion month/year (e.g. 2021年3月築)" },
              keyFeatures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of premium highlights (e.g. ネット無料, バストイレ別, 新築, オートロック, 宅配ボックス)"
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
          japaneseCopy: { type: Type.STRING, description: "The complete Japanese recruitment marketing copy text" },
          chineseCopy: { type: Type.STRING, description: "The complete Chinese (Xiaohongshu style) recommendation text" },
          englishCopy: { type: Type.STRING, description: "The complete global English marketing copy text" }
        },
        required: ["specs", "japaneseCopy", "chineseCopy", "englishCopy"]
      }
    }
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Geminiからの応答が空でした。再度お試しください。");
  }

  try {
    const parsed: GeneratedResult = JSON.parse(rawText.trim());
    return parsed;
  } catch (error) {
    console.error("Failed to parse Gemini JSON output. Raw text was:", rawText);
    throw new Error(
      "AIの応答をJSON解析できませんでした。図面画像が不鮮明な可能性があります。もう一度試すか、別の画像を試してください。"
    );
  }
}

/**
 * Regenerates the recruitment descriptions solely based on updated property specs
 * without re-analyzing the image. This is extremely efficient and fast.
 */
export async function regenerateCopyFromSpecs(
  specs: ExtractedPropertySpecs,
  customPrompt?: string,
  overrideApiKey?: string
): Promise<Omit<GeneratedResult, "specs">> {
  const ai = getGeminiClient(overrideApiKey);

  const prompt = `
あなたはプロの不動産仲介代理店のエージェントで、コピーライターです。
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt.trim(),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          japaneseCopy: { type: Type.STRING, description: "Recruitment advertisement in Japanese" },
          chineseCopy: { type: Type.STRING, description: "Xiaohongshu advertisement in Chinese" },
          englishCopy: { type: Type.STRING, description: "Listing advertisement in English" }
        },
        required: ["japaneseCopy", "chineseCopy", "englishCopy"]
      }
    }
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("コピー再生成時に空の応答が返されました。");
  }

  try {
    const parsed: Omit<GeneratedResult, "specs"> = JSON.parse(rawText.trim());
    return parsed;
  } catch (error) {
    console.error("Failed to parse regenerated JSON:", rawText);
    throw new Error("修正データに基づいた紹介文の再構成に失敗しました。");
  }
}
