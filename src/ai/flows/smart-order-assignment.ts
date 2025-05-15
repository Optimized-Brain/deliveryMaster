
'use server';
/**
 * @fileOverview This file defines a Genkit flow for smart order assignment suggestions to delivery partners.
 *
 * - assignOrder - Suggests the most suitable delivery partner based on location, load, and area.
 * - AssignOrderInput - The input type for the assignOrder function.
 * - AssignOrderOutput - The return type for the assignOrder function (contains a suggestion).
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
  suggestedPartnerId: z.string().describe('The ID of the partner suggested for the order.'),
  reason: z.string().describe('The reason for suggesting this partner.'),
});
export type AssignOrderOutput = z.infer<typeof AssignOrderOutputSchema>;

export async function assignOrder(input: AssignOrderInput): Promise<AssignOrderOutput> {
  return assignOrderFlow(input);
}

const assignOrderPrompt = ai.definePrompt({
  name: 'assignOrderSuggestionPrompt', // Renamed for clarity
  input: {schema: AssignOrderInputSchema},
  output: {schema: AssignOrderOutputSchema},
  prompt: `You are an expert delivery dispatch advisor. Given an order and a list of available delivery partners, suggest the best partner to assign the order to.

Consider the partner's location, current load, assigned areas, and availability. Your goal is to suggest a partner that would minimize delivery time and optimize partner utilization.

Order ID: {{{orderId}}}
Order Location: {{{orderLocation}}}

Available Partners:
{{#each partnerList}}
- Partner ID: {{{partnerId}}}, Location: {{{location}}}, Load: {{{currentLoad}}}, Areas: {{#each assignedAreas}}{{{this}}}{{/each}}, Available: {{isAvailable}}
{{/each}}

Based on the above information, which partner do you suggest for this order? Explain your reasoning clearly. Return the suggested partner ID and your reason in JSON format.`,
});

const assignOrderFlow = ai.defineFlow(
  {
    name: 'assignOrderSuggestionFlow', // Renamed for clarity
    inputSchema: AssignOrderInputSchema,
    outputSchema: AssignOrderOutputSchema,
  },
  async input => {
    const {output} = await assignOrderPrompt(input);
    return output!;
  }
);
