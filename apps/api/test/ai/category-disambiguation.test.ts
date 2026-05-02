import assert from 'node:assert/strict';
import test from 'node:test';

import { disambiguateVisionCategory } from '../../src/ai/category-disambiguation';

test('does not promote services to emploi on generic business card OCR', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'services',
      condition: 'used_good',
      description: 'Carte professionnelle visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Business card'],
      logos: ['Zwibba Pro'],
      objects: ['Document'],
      ocrText: 'ZWIBBA PRO\nPlomberie 7j/7\n+243 000 000 000',
    },
  });

  assert.equal(result.categoryId, 'services');
});

test('promotes service uniforms with explicit service wording to services', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'fashion',
      condition: 'used_good',
      description:
        "Salopette de travail noire avec une étiquette marquée 'СЕРВИС' sur la poche.",
      title: 'Ensemble salopette de travail',
    },
    signals: {
      labels: ['Workwear'],
      logos: [],
      objects: ['Clothing'],
      ocrText: '',
    },
  });

  assert.equal(result.categoryId, 'services');
});

test('promotes plumbing repair contexts to services even without the literal word service', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'construction',
      condition: 'used_good',
      description: 'Allen wrench for plumbing repair.',
      title: 'Mécanicien plomberie',
    },
    signals: {
      labels: ['Tool'],
      logos: [],
      objects: ['Wrench'],
      ocrText: '',
    },
  });

  assert.equal(result.categoryId, 'services');
});

test('promotes to emploi only on explicit recruiting evidence', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Affiche visible sur la photo.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Job posting'],
      logos: [],
      objects: ['Poster'],
      ocrText: 'Recrutement commercial\nPoste disponible immédiatement',
    },
  });

  assert.equal(result.categoryId, 'emploi');
});

test('does not promote generic audio electronics to music on weak evidence', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Appareil audio visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Speaker', 'Electronics'],
      logos: [],
      objects: ['Speaker'],
      ocrText: 'Bluetooth speaker',
    },
  });

  assert.equal(result.categoryId, 'electronics');
});

test('promotes clear instruments to music', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Instrument visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Keyboard instrument'],
      logos: ['Yamaha'],
      objects: ['Musical keyboard'],
      ocrText: 'Yamaha clavier musical',
    },
  });

  assert.equal(result.categoryId, 'music');
});

test('promotes chantier tools to construction', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Matériel visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Power tool'],
      logos: ['Bosch'],
      objects: ['Drill'],
      ocrText: 'Perceuse chantier Bosch',
    },
  });

  assert.equal(result.categoryId, 'construction');
});

test('does not promote a generic bottle to beauty or health on weak evidence', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Bottle'],
      logos: [],
      objects: ['Bottle'],
      ocrText: 'Flacon 250 ml',
    },
  });

  assert.equal(result.categoryId, 'electronics');
});

test('promotes explicit cosmetic products to beauty', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'new_item',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Cosmetics'],
      logos: [],
      objects: ['Lipstick'],
      ocrText: 'Rouge à lèvres mat longue tenue',
    },
  });

  assert.equal(result.categoryId, 'beauty');
});

test('promotes explicit medical gear to health', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Medical equipment'],
      logos: [],
      objects: ['Thermometer'],
      ocrText: 'Thermomètre digital',
    },
  });

  assert.equal(result.categoryId, 'health');
});

test('promotes packaged groceries to food', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'agriculture',
      condition: 'new_item',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Food product'],
      logos: [],
      objects: ['Package'],
      ocrText: 'Farine de maïs 25kg',
    },
  });

  assert.equal(result.categoryId, 'food');
});

test('promotes farming tools to agriculture', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Sprayer'],
      logos: [],
      objects: ['Sprayer'],
      ocrText: 'Pulvérisateur agricole 16L',
    },
  });

  assert.equal(result.categoryId, 'agriculture');
});

test('promotes clear school supply bundles to education', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'home_garden',
      condition: 'new_item',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['School supplies'],
      logos: [],
      objects: ['Notebook'],
      ocrText: 'Pack fournitures scolaires',
    },
  });

  assert.equal(result.categoryId, 'education');
});

test('promotes education when Gemini already describes a school-supplies bundle', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'new_item',
      description:
        'Ensemble de fournitures de bureau comprenant une calculatrice, deux carnets et des crayons.',
      title: 'Calculatrice et fournitures de bureau',
    },
    signals: {
      labels: ['Office supplies'],
      logos: [],
      objects: ['Calculator'],
      ocrText: '',
    },
  });

  assert.equal(result.categoryId, 'education');
});

test('promotes papeterie bundles with calculator cues to education', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'new_item',
      description: 'Ensemble de papeterie avec calculatrice.',
      title: 'Calculatrice et papeterie',
    },
    signals: {
      labels: ['Office supplies'],
      logos: [],
      objects: ['Calculator'],
      ocrText: '',
    },
  });

  assert.equal(result.categoryId, 'education');
});

test('does not promote generic office items to education on weak evidence', () => {
  const result = disambiguateVisionCategory({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Produit visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Desk accessory'],
      logos: [],
      objects: ['Pen holder'],
      ocrText: 'Bureau',
    },
  });

  assert.equal(result.categoryId, 'electronics');
});
