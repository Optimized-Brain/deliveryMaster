
import { NextResponse } from 'next/server';
import type { Order, Partner } from '@/lib/types';

interface SuggestAssignmentInput {
  order: Order;
  partners: Array<Pick<Partner, 'id' | 'name' | 'assignedAreas' | 'currentLoad' | 'shiftStart' | 'shiftEnd' | 'status'>>;
}

interface AISuggestionOutput {
  suggestedPartnerName?: string;
  reason?: string;
  suggestionMade: boolean;
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`;

export async function POST(request: Request) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ message: 'Server configuration error: GOOGLE_API_KEY is missing.' }, { status: 500 });
  }

  try {
    const body: SuggestAssignmentInput = await request.json();
    const { order, partners } = body;

    if (!order || !partners) {
      return NextResponse.json({ message: 'Order and partner list are required.' }, { status: 400 });
    }

    const activePartners = partners.filter(p => p.status === 'active');
    if (activePartners.length === 0) {
      return NextResponse.json({
        suggestionMade: false,
        reason: "No active partners are currently available for assignment.",
      } as AISuggestionOutput);
    }

    // Prepare a simplified list of partners for the prompt
    const partnerInfoForPrompt = activePartners.map(p => ({
      name: p.name,
      areas: p.assignedAreas.join(', '),
      load: p.currentLoad,
      shift: `${p.shiftStart}-${p.shiftEnd}`,
    }));

    const prompt = `
      You are an intelligent dispatch system for SwiftRoute, a delivery service.
      Your task is to suggest the most suitable delivery partner for a new order.

      Order Details:
      - Order ID: ${order.id.substring(0,8)}
      - Customer Name: ${order.customerName}
      - Delivery Area: ${order.area}
      - Items: ${order.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ')}
      - Order Value: ₹${order.orderValue}

      Available Active Delivery Partners:
      ${partnerInfoForPrompt.map(p => `- Name: ${p.name}, Areas: ${p.areas}, Current Load: ${p.load}, Shift: ${p.shift}`).join('\n      ')}

      Consider these factors for suggestion:
      1. Partner's assigned area(s) should ideally include the order's delivery area.
      2. Partner's current load (lower is better, avoid overloading). Assume a maximum load capacity of 5.
      3. Partner's shift timings (ensure the order can be reasonably delivered within their shift).

      Your output MUST be a JSON object with the following structure:
      {
        "suggestionMade": boolean, // true if a partner is suggested, false otherwise
        "suggestedPartnerName": string, // (Optional) The name of the suggested partner. Include only if suggestionMade is true.
        "reason": string // (Optional) A brief explanation for your suggestion (e.g., "Rajesh is in the area and has low load") or why no suggestion could be made (e.g., "No partners available in Koramangala with capacity"). Max 1-2 sentences.
      }

      Analyze the partners and suggest the best fit. If multiple partners are equally good, pick one.
      If no partner is suitable (e.g., no one covers the area, all are at max load, or outside shift), set "suggestionMade" to false and provide a reason.
      Do not suggest a partner if their current load is 5 or more.
    `;

    const geminiRequestPayload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        // Ensure JSON output if the model supports it, otherwise, we parse the text.
        // For gemini-pro, we typically expect text and parse it.
        // responseMimeType: "application/json", // Not directly supported by gemini-pro like this, we ensure our prompt asks for JSON
        temperature: 0.3,
        maxOutputTokens: 200,
      }
    };

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestPayload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Error:", errorBody);
      return NextResponse.json({ message: `Error from AI service: ${geminiResponse.statusText}`, details: errorBody }, { status: geminiResponse.status });
    }

    const geminiData = await geminiResponse.json();
    
    let aiResponseText = "";
    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0]) {
      aiResponseText = geminiData.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected Gemini API response structure:", geminiData);
      return NextResponse.json({ message: 'AI service returned an unexpected response structure.' }, { status: 500 });
    }
    
    // Clean the response text to extract JSON
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch || !jsonMatch[0]) {
      console.error("AI response did not contain valid JSON:", aiResponseText);
      return NextResponse.json({ message: 'AI response could not be parsed as JSON.', rawResponse: aiResponseText }, { status: 500 });
    }

    try {
      const parsedSuggestion: AISuggestionOutput = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsedSuggestion);
    } catch (e) {
      console.error("Failed to parse JSON from AI response:", jsonMatch[0], e);
      return NextResponse.json({ message: 'AI response was not valid JSON.', rawResponse: jsonMatch[0], error: (e as Error).message }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in suggest-assignment API:", error);
    return NextResponse.json({ message: 'Internal server error.', error: (error as Error).message }, { status: 500 });
  }
}
