import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useDatabase() {
  // Raw Materials
  const getRawMaterials = useCallback(async () => {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('id');
    return { data, error };
  }, []);

  const createRawMaterial = useCallback(async (material) => {
    const { data, error } = await supabase
      .from('raw_materials')
      .insert([material]);
    return { data, error };
  }, []);

  const updateRawMaterial = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('raw_materials')
      .update(updates)
      .eq('id', id);
    return { data, error };
  }, []);

  // Finished Products
  const getFinishedProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('finished_products')
      .select('*')
      .order('id');
    return { data, error };
  }, []);

  const createFinishedProduct = useCallback(async (product) => {
    const { data, error } = await supabase
      .from('finished_products')
      .insert([product]);
    return { data, error };
  }, []);

  // Production Lots
  const getProductionLots = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_lots')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }, []);

  const createProductionLot = useCallback(async (lot) => {
    const { data, error } = await supabase
      .from('production_lots')
      .insert([lot]);
    return { data, error };
  }, []);

  const updateProductionLot = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('production_lots')
      .update(updates)
      .eq('id', id);
    return { data, error };
  }, []);

  // Formulas
  const getFormulas = useCallback(async (productId) => {
    const { data, error } = await supabase
      .from('formulas')
      .select('*')
      .eq('product_id', productId);
    return { data, error };
  }, []);

  const createFormula = useCallback(async (formula) => {
    const { data, error } = await supabase
      .from('formulas')
      .insert([formula]);
    return { data, error };
  }, []);

  const deleteFormula = useCallback(async (id) => {
    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', id);
    return { error };
  }, []);

  // Stock Movements
  const getStockMovements = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }, []);

  const createStockMovement = useCallback(async (movement) => {
    const { data, error } = await supabase
      .from('stock_movements')
      .insert([movement]);
    return { data, error };
  }, []);

  // Issue Records
  const getIssueRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('issue_records')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }, []);

  const createIssueRecord = useCallback(async (issue) => {
    const { data, error } = await supabase
      .from('issue_records')
      .insert([issue]);
    return { data, error };
  }, []);

  // Dispatch Records
  const getDispatchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('dispatch_records')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }, []);

  const createDispatchRecord = useCallback(async (dispatch) => {
    const { data, error } = await supabase
      .from('dispatch_records')
      .insert([dispatch]);
    return { data, error };
  }, []);

  // QC Test Results
  const getQCTestResults = useCallback(async (lotId) => {
    const { data, error } = await supabase
      .from('qc_test_results')
      .select('*')
      .eq('lot_id', lotId);
    return { data, error };
  }, []);

  const createQCTestResult = useCallback(async (result) => {
    const { data, error } = await supabase
      .from('qc_test_results')
      .insert([result]);
    return { data, error };
  }, []);

  const updateQCTestResult = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('qc_test_results')
      .update(updates)
      .eq('id', id);
    return { data, error };
  }, []);

  // Update Raw Material Stock (สำหรับ Phase 4 - Stock Management)
  const updateRawMaterialStock = useCallback(async (id, newStock) => {
    const { data, error } = await supabase
      .from('raw_materials')
      .update({ stock: newStock })
      .eq('id', id);
    return { data, error };
  }, []);

 // Delete Production Lot (Phase 6)
  const deleteProductionLot = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('production_lots')
      .delete()
      .eq('id', id);
    return { data, error };
  }, []); 

  return {
    getRawMaterials,
    createRawMaterial,
    updateRawMaterial,
    getFinishedProducts,
    createFinishedProduct,
    getProductionLots,
    createProductionLot,
    updateProductionLot,
    getFormulas,
    createFormula,
    deleteFormula,
    getStockMovements,
    createStockMovement,
    getIssueRecords,
    createIssueRecord,
    getDispatchRecords,
    createDispatchRecord,
    getQCTestResults,
    createQCTestResult,
    updateQCTestResult,
        updateRawMaterialStock,
        deleteProductionLot
  };
}