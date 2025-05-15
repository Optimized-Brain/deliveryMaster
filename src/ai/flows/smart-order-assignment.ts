
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
      partnerName: z.string().describe("The name of the delivery partner."),
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
  suggestedPartnerName: z.string().optional().describe('The NAME of the partner suggested for the order, if a suggestion was made.'),
  reason: z.string().optional().describe('The reason for the suggestion, or an explanation if no suitable partner was found.'),
});
export type AssignOrderOutput = z.infer<typeof AssignOrderOutputSchema>;

export async function assignOrder(input: AssignOrderInput): Promise<AssignOrderOutput> {
  return assignOrderFlow(input);
}

const assignOrderPrompt = ai.definePrompt({
  name: 'assignOrderSuggestionPrompt',
  input: {schema: AssignOrderInputSchema},
  output: {schema: AssignOrderOutputSchema},
  prompt: `You are an expert delivery dispatch advisor. Given an order and a list of available delivery partners, suggest the best partner (by NAME) to assign the order to, or indicate if no suitable partner is found.

Consider the partner's location relative to the order, current load, assigned areas, and availability. Your goal is to suggest a partner that would minimize delivery time and optimize partner utilization.

Order ID: {{{orderId}}}
Order Location: {{{orderLocation}}}

Available Partners:
{{#each partnerList}}
- Partner ID: {{{partnerId}}}, Partner Name: {{{partnerName}}}, Location: {{{location}}}, Load: {{{currentLoad}}}, Areas: {{#each assignedAreas}}{{{this}}}{{/each}}, Available: {{isAvailable}}
{{/each}}

Based on the above information:
1. Determine if a suitable partner can be suggested.
2. If a suitable partner is found:
   - Set 'suggestionMade' to true.
   - Set 'suggestedPartnerName' to the NAME of that partner.
   - Set 'reason' to a brief explanation of why this partner is a good choice (e.g., "Closest available partner with low load in the order's area.").
3. If no suitable partner is found (e.g., no partners in the area, all eligible partners are at maximum load or unavailable):
   - Set 'suggestionMade' to false.
   - Do NOT set 'suggestedPartnerName'.
   - Set 'reason' to a brief explanation of why no partner could be suggested (e.g., "No partners available in {{{orderLocation}}}." or "All nearby partners are at maximum load.").

Return your response in JSON format.`,
});

const assignOrderFlow = ai.defineFlow(
  {
    name: 'assignOrderSuggestionFlow',
    inputSchema: AssignOrderInputSchema,
    outputSchema: AssignOrderOutputSchema,
  },
  async input => {
    const {output} = await assignOrderPrompt(input);
    if (output && !output.suggestionMade) {
      delete output.suggestedPartnerName; // Ensure partner name is not present if no suggestion made
    }
    return output!;
  }
);
