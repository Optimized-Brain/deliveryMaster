
'use server';
/**
 * @fileOverview This file defines a Genkit flow for smart order assignment suggestions to delivery partners.
 *
 * - assignOrder - Suggests the most suitable delivery partner based on location, load, and area, or indicates why no suggestion can be made.
 * - AssignOrderInput - The input type for the assignOrder function.
 * - AssignOrderOutput - The return type for the assignOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignOrderInputSchema = z.object({
  orderId: z.string().describe('The ID of the order to be assigned.'),
  orderLocation: z.string().describe('The current location of the order.'),
  partnerList: z
    .array(z.object({
      partnerId: z.string(),
      location: z.string(),
      currentLoad: z.number(),
      assignedAreas: z.array(z.string()),
      isAvailable: z.boolean().describe('Whether the partner is available for delivery.'),
    }))
    .describe('A list of available delivery partners with their details.'),
});
export type AssignOrderInput = z.infer<typeof AssignOrderInputSchema>;

const AssignOrderOutputSchema = z.object({
  suggestionMade: z.boolean().describe('Indicates if a partner suggestion was made.'),
  suggestedPartnerId: z.string().optional().describe('The ID of the partner suggested for the order, if a suggestion was made.'),
  // Reason field removed as per user request for AI to be just a helper
});
export type AssignOrderOutput = z.infer<typeof AssignOrderOutputSchema>;

export async function assignOrder(input: AssignOrderInput): Promise<AssignOrderOutput> {
  return assignOrderFlow(input);
}

const assignOrderPrompt = ai.definePrompt({
  name: 'assignOrderSuggestionPrompt',
  input: {schema: AssignOrderInputSchema},
  output: {schema: AssignOrderOutputSchema},
  prompt: `You are an expert delivery dispatch advisor. Given an order and a list of available delivery partners, suggest the best partner to assign the order to, or indicate if no suitable partner is found.

Consider the partner's location relative to the order, current load, assigned areas, and availability. Your goal is to suggest a partner that would minimize delivery time and optimize partner utilization.

Order ID: {{{orderId}}}
Order Location: {{{orderLocation}}}

Available Partners:
{{#each partnerList}}
- Partner ID: {{{partnerId}}}, Location: {{{location}}}, Load: {{{currentLoad}}}, Areas: {{#each assignedAreas}}{{{this}}}{{/each}}, Available: {{isAvailable}}
{{/each}}

Based on the above information:
1. Determine if a suitable partner can be suggested.
2. If a suitable partner is found:
   - Set 'suggestionMade' to true.
   - Set 'suggestedPartnerId' to the ID of that partner.
3. If no suitable partner is found (e.g., no partners in the area, all eligible partners are at maximum load or unavailable):
   - Set 'suggestionMade' to false.
   - Do NOT set 'suggestedPartnerId'.

Return your response in JSON format. Do not provide a textual reason or explanation field in your output.`,
});

const assignOrderFlow = ai.defineFlow(
  {
    name: 'assignOrderSuggestionFlow',
    inputSchema: AssignOrderInputSchema,
    outputSchema: AssignOrderOutputSchema,
  },
  async input => {
    const {output} = await assignOrderPrompt(input);
    // Ensure the output conforms, especially if suggestedPartnerId should be absent when suggestionMade is false
    if (output && !output.suggestionMade) {
      delete output.suggestedPartnerId;
    }
    return output!;
  }
);
