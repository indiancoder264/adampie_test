
"use client";

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRecipes } from '@/lib/recipes';

export function SearchAndFilter() {
    const { recipes } = useRecipes();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State is derived from URL for consistency, but also managed locally for responsiveness.
    const [searchQuery, setSearchQuery] = React.useState(searchParams.get('q') || '');
    const [mealCategoryFilter, setMealCategoryFilter] = React.useState(searchParams.get('meal') || 'all');
    const [consumptionTimeFilter, setConsumptionTimeFilter] = React.useState(searchParams.get('time') || 'all');
    
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    // This effect synchronizes the component's state with the URL's query parameters.
    // This is crucial for handling browser back/forward navigation correctly.
    React.useEffect(() => {
        setSearchQuery(searchParams.get('q') || '');
        setMealCategoryFilter(searchParams.get('meal') || 'all');
        setConsumptionTimeFilter(searchParams.get('time') || 'all');
    }, [searchParams]);

    const updateURL = (params: URLSearchParams) => {
        router.push(`${pathname}?${params.toString()}`);
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        const params = new URLSearchParams(searchParams.toString());
        
        if (searchQuery.trim()) {
            params.set('q', searchQuery.trim());
        } else {
            params.delete('q');
        }
        
        if (mealCategoryFilter !== 'all') {
            params.set('meal', mealCategoryFilter);
        } else {
            params.delete('meal');
        }

        if (consumptionTimeFilter !== 'all') {
            params.set('time', consumptionTimeFilter);
        } else {
            params.delete('time');
        }

        updateURL(params);
        setIsPopoverOpen(false);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        updateURL(params);
    }

    const resetFilters = () => {
        setSearchQuery('');
        setMealCategoryFilter('all');
        setConsumptionTimeFilter('all');
        
        // Directly navigate to the base path to clear all query parameters
        router.push(pathname);
        setIsPopoverOpen(false);
    };
    
    // Get unique values for filter dropdowns
    const mealCategories = React.useMemo(() => ['all', ...Array.from(new Set(recipes.map(r => r.meal_category).filter(Boolean)))], [recipes]);
    const consumptionTimes = React.useMemo(() => ['all', ...Array.from(new Set(recipes.flatMap(r => r.consumption_time).filter(Boolean)))], [recipes]);

    return (
        <form onSubmit={handleSearch} className="mt-8 flex w-full max-w-2xl items-center space-x-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    name="q"
                    placeholder="Search recipes, cuisines..."
                    className="w-full pl-10 text-black [appearance:textfield] [&::-webkit-search-cancel-button]:appearance-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <Button variant="ghost" size="icon" type="button" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full" onClick={handleClearSearch}>
                        <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                )}
            </div>
            <Button type="submit" size="icon">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
            </Button>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="secondary" size="icon" type="button">
                        <Filter className="h-5 w-5" />
                        <span className="sr-only">Open filters</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setIsPopoverOpen(false)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filters</h4>
                            <p className="text-sm text-muted-foreground">
                                Refine your search.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="meal-category">Meal Category</Label>
                                <Select value={mealCategoryFilter} onValueChange={setMealCategoryFilter}>
                                    <SelectTrigger id="meal-category" className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {mealCategories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="consumption-time">Recommended</Label>
                                <Select value={consumptionTimeFilter} onValueChange={setConsumptionTimeFilter}>
                                    <SelectTrigger id="consumption-time" className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {consumptionTimes.map(time => <SelectItem key={time} value={time}>{time === 'all' ? 'Any Time' : time}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <Button variant="ghost" type="button" onClick={resetFilters}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Reset
                            </Button>
                            <Button type="submit">Apply & Search</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </form>
    )
}
