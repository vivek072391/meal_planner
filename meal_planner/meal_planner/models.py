from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Ingredient:
    name: str
    quantity: float
    unit: str = ""

@dataclass
class Recipe:
    id: str
    title: str
    ingredients: List[Ingredient]
    cook_time_mins: int
    bulk: bool = False
    tags: List[str] = field(default_factory=list)
    servings: int = 1

@dataclass
class PantryItem:
    name: str
    quantity: float
    unit: str = ""
