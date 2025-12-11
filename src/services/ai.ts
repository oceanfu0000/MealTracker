export interface AnalyzedMeal {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
}

// Fallback mock if no key provided
const MOCK_MEAL: AnalyzedMeal = {
    name: "Grilled Chicken & Rice (Mock)",
    calories: 450,
    protein: 40,
    carbs: 45,
    fat: 12,
    confidence: 0.95
};

export const AIService = {
    async analyzeImage(file: File): Promise<AnalyzedMeal> {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
            console.warn("No OpenAI Key found. Using Mock Data.");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return MOCK_MEAL;
        }

        try {
            // Convert file to base64
            const base64Image = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o", // or gpt-4-turbo
                    messages: [
                        {
                            role: "system",
                            content: "You are a nutritionist AI. Analyze the food in the image. Return ONLY a JSON object with these fields: name (string), calories (number), protein (number), carbs (number), fat (number), confidence (0-1 number). Do not include markdown formatting (```json)."
                        },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Analyze this meal." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 300
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'OpenAI API Error');
            }

            const content = data.choices[0].message.content;
            // Clean potential json markers if the model ignores the instruction
            const jsonStr = content.replace(/```json|```/g, '').trim();
            const result = JSON.parse(jsonStr);

            return {
                name: result.name || "Unknown Meal",
                calories: result.calories || 0,
                protein: result.protein || 0,
                carbs: result.carbs || 0,
                fat: result.fat || 0,
                confidence: result.confidence || 0.5
            };

        } catch (error) {
            console.error("AI Analysis failed:", error);
            alert("AI Error: " + (error instanceof Error ? error.message : "Unknown error"));
            return MOCK_MEAL;
        }
    }
};
