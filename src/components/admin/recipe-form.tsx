
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2 } from "lucide-react";
import React from "react";
import type { Recipe } from "@/lib/recipes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";

const recipeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  region: z.string().min(2, "Region is required"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  prep_time: z.string().min(1, "Prep time is required"),
  cook_time: z.string().min(1, "Cook time is required"),
  servings: z.string().min(1, "Servings are required"),
  image_url: z.string().url("Must be a valid image URL"),
  published: z.boolean().default(true),
  dietary_type: z.enum(["Vegetarian", "Non-Vegetarian", "Vegan"]),
  meal_category: z.string().min(1, "Meal category is required."),
  consumption_time: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one consumption time.",
  }),
  dietary_notes: z.array(z.string()).optional(),
  ingredients: z.array(z.object({ value: z.string().min(1, "Ingredient cannot be empty") })).min(1, "At least one ingredient is required"),
  steps: z.array(z.object({ value: z.string().min(1, "Step cannot be empty") })).min(1, "At least one step is required"),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;

type RecipeFormProps = {
  recipe: Recipe | null;
  onSave: (data: RecipeFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

const consumptionTimeItems = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const dietaryNoteItems = ['Gluten-Free', 'Dairy-Free', 'Contains Nuts', 'Spicy'];

export function RecipeForm({ recipe, onSave, onCancel, isSubmitting }: RecipeFormProps) {
  const defaultValues = React.useMemo(() => ({
    name: recipe?.name ?? "",
    region: recipe?.region ?? "",
    description: recipe?.description ?? "",
    prep_time: recipe?.prep_time ?? "",
    cook_time: recipe?.cook_time ?? "",
    servings: recipe?.servings ?? "",
    image_url: recipe?.image_url ?? "https://placehold.co/800x400.png",
    published: recipe?.published ?? true,
    dietary_type: recipe?.dietary_type ?? "Non-Vegetarian",
    meal_category: recipe?.meal_category ?? "",
    consumption_time: recipe?.consumption_time ?? [],
    dietary_notes: recipe?.dietary_notes ?? [],
    ingredients: recipe?.ingredients.map(i => ({ value: `${i.quantity} ${i.name}`})) ?? [{ value: "" }],
    steps: recipe?.steps.map(s => ({ value: s.description })) ?? [{ value: "" }],
  }), [recipe]);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues,
  });
  
  React.useEffect(() => {
    form.reset(defaultValues);
  }, [recipe, defaultValues, form]);

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    name: "ingredients",
    control: form.control,
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    name: "steps",
    control: form.control,
  });

  const onSubmit = (data: RecipeFormValues) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem><FormLabel>Cuisine/Region</FormLabel><FormControl><Input {...field} placeholder="e.g., Italian, Indian, French" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="prep_time" render={({ field }) => (
                <FormItem><FormLabel>Prep Time</FormLabel><FormControl><Input {...field} placeholder="e.g., 15 mins"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cook_time" render={({ field }) => (
                <FormItem><FormLabel>Cook Time</FormLabel><FormControl><Input {...field} placeholder="e.g., 30 mins"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="servings" render={({ field }) => (
                <FormItem><FormLabel>Servings</FormLabel><FormControl><Input {...field} placeholder="e.g., 4 people"/></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="image_url" render={({ field }) => (
              <FormItem>
                <FormLabel>Image URL</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription>
                  Find an image online, right-click it, select "Copy Image Address", and paste the link here.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="meal_category" render={({ field }) => (
                <FormItem><FormLabel>Meal Category</FormLabel><FormControl><Input {...field} placeholder="e.g., Main Course, Appetizer" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dietary_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a dietary type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                      <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="Vegan">Vegan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="consumption_time" render={() => (
                    <FormItem>
                        <FormLabel>Consumption Time</FormLabel>
                        <FormDescription>When is this meal typically eaten?</FormDescription>
                        {consumptionTimeItems.map((item) => (
                        <FormField key={item} control={form.control} name="consumption_time" render={({ field }) => (
                            <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(field.value?.filter((value) => value !== item))
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{item}</FormLabel>
                            </FormItem>
                        )}/>
                        ))}
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="dietary_notes" render={() => (
                    <FormItem>
                        <FormLabel>Dietary Notes</FormLabel>
                        <FormDescription>Select any applicable dietary notes.</FormDescription>
                         {dietaryNoteItems.map((item) => (
                        <FormField key={item} control={form.control} name="dietary_notes" render={({ field }) => (
                            <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...(field.value || []), item])
                                            : field.onChange(field.value?.filter((value) => value !== item))
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{item}</FormLabel>
                            </FormItem>
                        )}
                        />
                        ))}
                        <FormMessage />
                    </FormItem>
                )}/>
             </div>
            
            <div>
              <FormLabel>Ingredients</FormLabel>
              <FormDescription>Add at least one ingredient. Include quantity, e.g., "1 cup Flour".</FormDescription>
              <div className="space-y-2 mt-2">
                {ingredientFields.map((field, index) => (
                  <FormField key={field.id} control={form.control} name={`ingredients.${index}.value`} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl><Input {...field} placeholder={`Ingredient ${index + 1}`} /></FormControl>
                        {ingredientFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}/>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendIngredient({ value: "" })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
              </Button>
            </div>

            <div>
              <FormLabel>Steps</FormLabel>
              <FormDescription>Add at least one cooking step.</FormDescription>
              <div className="space-y-2 mt-2">
                {stepFields.map((field, index) => (
                  <FormField key={field.id} control={form.control} name={`steps.${index}.value`} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl><Textarea {...field} placeholder={`Step ${index + 1}`} /></FormControl>
                        {stepFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendStep({ value: "" })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Step
              </Button>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-6">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (recipe ? 'Saving...' : 'Creating...') : (recipe ? 'Save Changes' : 'Create Recipe')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
