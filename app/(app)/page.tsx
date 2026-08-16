'use client';

import { useExpenses, useToday } from '@/lib/store';
import { useAllCategories, useCategoryStore } from '@/lib/category-store';
import { Home } from '@/components/views/Home';

export default function HomePage() {
  const {
    amount,
    note,
    setNote,
    parseAmount,
    addExpense,
    updateExpense,
    expenses,
    showAll,
    setShowAll,
    handleDeleteExpense,
    undo,
    setUndo,
  } = useExpenses();
  const today = useToday();
  const allCategories = useAllCategories();
  const setCategoryDialog = useCategoryStore((s) => s.setCategoryDialog);

  return (
    <Home
      amount={amount}
      note={note}
      setNote={setNote}
      parseAmount={parseAmount}
      addExpense={addExpense}
      updateExpense={updateExpense}
      displayed={showAll ? expenses : today}
      showAll={showAll}
      setShowAll={setShowAll}
      remove={handleDeleteExpense}
      undo={undo}
      setUndo={setUndo}
      categories={allCategories}
      onAddCategory={() => setCategoryDialog(true)}
    />
  );
}
