/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * Entity that maps to annotations table in the annotations database.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Entity
@Table(name = "annotation", catalog = "phenodcc_annotations", schema = "")
@XmlRootElement
@NamedQueries({
    @NamedQuery(name = "Annotation.findByGidParameterKey", query = "SELECT new org.mousephenotype.dcc.visualise.entities.AnnotationData(a.annotationId, a.pvalueDouble, a.effectSize, a.genotypeestimateSE, a.maleMutantN, a.maleBaslineN, a.femaleMutantN, a.femaleBaslineN, a.zygosity, a.success, a.yMP, a.yMP1, a.metadataGroup) FROM Annotation a WHERE a.genotypeId = :genotypeId AND a.parameterId = :parameterKey")
})
public class Annotation implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "annotation_id", nullable = false)
    private Long annotationId;
    @Column(length = 64)
    private String pvalue;
    @Column(length = 64)
    private String effectSize;
    @Column(length = 64)
    private String testName;
    @Column(name = "keep_batch", length = 64)
    private String keepBatch;
    @Column(name = "variance_test", length = 64)
    private String varianceTest;
    @Column(name = "Nulltest_genotype_pvalue", length = 64)
    private String nulltestgenotypepvalue;
    @Column(name = "genotype_estimate", length = 64)
    private String genotypeEstimate;
    @Column(name = "genotype_estimate_SE", length = 64)
    private String genotypeestimateSE;
    @Column(name = "genotype_p_value", length = 64)
    private String genotypePValue;
    @Column(name = "gender_estimate", length = 64)
    private String genderEstimate;
    @Column(name = "gender_estimate_SE", length = 64)
    private String genderestimateSE;
    @Column(name = "gender_p_value", length = 64)
    private String genderPValue;
    @Column(name = "interaction_estimate", length = 64)
    private String interactionEstimate;
    @Column(name = "interaction_estimate_SE", length = 64)
    private String interactionestimateSE;
    @Column(name = "interaction_p_value", length = 64)
    private String interactionPValue;
    @Column(name = "weight_estimate", length = 64)
    private String weightEstimate;
    @Column(name = "weight_estimate_SE", length = 64)
    private String weightestimateSE;
    @Column(name = "weight_p_value", length = 64)
    private String weightPValue;
    @Column(name = "MM_fitquality", length = 64)
    private String mMfitquality;
    @Column(name = "intercept_estimate", length = 64)
    private String interceptEstimate;
    @Column(name = "intercept_estimate_SE", length = 64)
    private String interceptestimateSE;
    @Column(length = 64)
    private String maleMutantN;
    @Column(length = 64)
    private String maleBaslineN;
    @Column(length = 64)
    private String femaleMutantN;
    @Column(length = 64)
    private String femaleBaslineN;
    @Column(length = 64)
    private String maleP;
    @Column(length = 64)
    private String maleOddsRatio;
    @Column(length = 64)
    private String femaleP;
    @Column(length = 64)
    private String femaleOddsRatio;
    @Column(length = 64)
    private String parameterId;
    @Column(length = 64)
    private String metadataGroup;
    private Integer genotypeId;
    private Integer zygosity;
    private Integer strain;
    private Integer centre;
    private Boolean success;
    @Column(length = 255)
    private String failureMessage;
    @Column(name = "bonferoni_by_line", precision = 12)
    private Float bonferoniByLine;
    @Column(name = "bonferoni_by_parameter", precision = 12)
    private Float bonferoniByParameter;
    @Column(name = "hochberg_by_line", precision = 12)
    private Float hochbergByLine;
    @Column(name = "hochberg_by_parameter", precision = 12)
    private Float hochbergByParameter;
    @Column(precision = 12)
    private Float refRangeThreshold;
    @Column(precision = 12)
    private Float refRangeThresholdMales;
    @Column(precision = 12)
    private Float refRangeThresholdFemale;
    @Column(precision = 12)
    private Float rankSumP;
    @Column(precision = 12)
    private Float rankSumPMale;
    @Column(precision = 12)
    private Float rankSumPFemale;
    @Column(name = "MM_fitquality_2", length = 255)
    private String mMfitquality2;
    @Column(name = "MM_fitquality_3", length = 255)
    private String mMfitquality3;
    @Column(name = "MM_fitquality_4", length = 255)
    private String mMfitquality4;
    @Column(name = "MM_fitquality_5", length = 255)
    private String mMfitquality5;
    @Column(name = "MM_fitquality_6", length = 255)
    private String mMfitquality6;
    @Column(length = 255)
    private String rankSumEFMale;
    @Column(length = 255)
    private String rankSumEFFemale;
    @Lob
    @Column(length = 65535)
    private String csvFile;
    @Column(length = 55)
    private String status;
    @Column(name = "1y_MP", length = 55)
    private String yMP;
    @Column(name = "2y_MP", length = 55)
    private String yMP1;
    @Column(name = "pvalue_double", precision = 22)
    private Double pvalueDouble;

    public Annotation() {
    }

    public Annotation(Long annotationId) {
        this.annotationId = annotationId;
    }

    public Long getAnnotationId() {
        return annotationId;
    }

    public void setAnnotationId(Long annotationId) {
        this.annotationId = annotationId;
    }

    public String getPvalue() {
        return pvalue;
    }

    public void setPvalue(String pvalue) {
        this.pvalue = pvalue;
    }

    public String getEffectSize() {
        return effectSize;
    }

    public void setEffectSize(String effectSize) {
        this.effectSize = effectSize;
    }

    public String getTestName() {
        return testName;
    }

    public void setTestName(String testName) {
        this.testName = testName;
    }

    public String getKeepBatch() {
        return keepBatch;
    }

    public void setKeepBatch(String keepBatch) {
        this.keepBatch = keepBatch;
    }

    public String getVarianceTest() {
        return varianceTest;
    }

    public void setVarianceTest(String varianceTest) {
        this.varianceTest = varianceTest;
    }

    public String getNulltestgenotypepvalue() {
        return nulltestgenotypepvalue;
    }

    public void setNulltestgenotypepvalue(String nulltestgenotypepvalue) {
        this.nulltestgenotypepvalue = nulltestgenotypepvalue;
    }

    public String getGenotypeEstimate() {
        return genotypeEstimate;
    }

    public void setGenotypeEstimate(String genotypeEstimate) {
        this.genotypeEstimate = genotypeEstimate;
    }

    public String getGenotypeestimateSE() {
        return genotypeestimateSE;
    }

    public void setGenotypeestimateSE(String genotypeestimateSE) {
        this.genotypeestimateSE = genotypeestimateSE;
    }

    public String getGenotypePValue() {
        return genotypePValue;
    }

    public void setGenotypePValue(String genotypePValue) {
        this.genotypePValue = genotypePValue;
    }

    public String getGenderEstimate() {
        return genderEstimate;
    }

    public void setGenderEstimate(String genderEstimate) {
        this.genderEstimate = genderEstimate;
    }

    public String getGenderestimateSE() {
        return genderestimateSE;
    }

    public void setGenderestimateSE(String genderestimateSE) {
        this.genderestimateSE = genderestimateSE;
    }

    public String getGenderPValue() {
        return genderPValue;
    }

    public void setGenderPValue(String genderPValue) {
        this.genderPValue = genderPValue;
    }

    public String getInteractionEstimate() {
        return interactionEstimate;
    }

    public void setInteractionEstimate(String interactionEstimate) {
        this.interactionEstimate = interactionEstimate;
    }

    public String getInteractionestimateSE() {
        return interactionestimateSE;
    }

    public void setInteractionestimateSE(String interactionestimateSE) {
        this.interactionestimateSE = interactionestimateSE;
    }

    public String getInteractionPValue() {
        return interactionPValue;
    }

    public void setInteractionPValue(String interactionPValue) {
        this.interactionPValue = interactionPValue;
    }

    public String getWeightEstimate() {
        return weightEstimate;
    }

    public void setWeightEstimate(String weightEstimate) {
        this.weightEstimate = weightEstimate;
    }

    public String getWeightestimateSE() {
        return weightestimateSE;
    }

    public void setWeightestimateSE(String weightestimateSE) {
        this.weightestimateSE = weightestimateSE;
    }

    public String getWeightPValue() {
        return weightPValue;
    }

    public void setWeightPValue(String weightPValue) {
        this.weightPValue = weightPValue;
    }

    public String getMMfitquality() {
        return mMfitquality;
    }

    public void setMMfitquality(String mMfitquality) {
        this.mMfitquality = mMfitquality;
    }

    public String getInterceptEstimate() {
        return interceptEstimate;
    }

    public void setInterceptEstimate(String interceptEstimate) {
        this.interceptEstimate = interceptEstimate;
    }

    public String getInterceptestimateSE() {
        return interceptestimateSE;
    }

    public void setInterceptestimateSE(String interceptestimateSE) {
        this.interceptestimateSE = interceptestimateSE;
    }

    public String getMaleMutantN() {
        return maleMutantN;
    }

    public void setMaleMutantN(String maleMutantN) {
        this.maleMutantN = maleMutantN;
    }

    public String getMaleBaslineN() {
        return maleBaslineN;
    }

    public void setMaleBaslineN(String maleBaslineN) {
        this.maleBaslineN = maleBaslineN;
    }

    public String getFemaleMutantN() {
        return femaleMutantN;
    }

    public void setFemaleMutantN(String femaleMutantN) {
        this.femaleMutantN = femaleMutantN;
    }

    public String getFemaleBaslineN() {
        return femaleBaslineN;
    }

    public void setFemaleBaslineN(String femaleBaslineN) {
        this.femaleBaslineN = femaleBaslineN;
    }

    public String getMaleP() {
        return maleP;
    }

    public void setMaleP(String maleP) {
        this.maleP = maleP;
    }

    public String getMaleOddsRatio() {
        return maleOddsRatio;
    }

    public void setMaleOddsRatio(String maleOddsRatio) {
        this.maleOddsRatio = maleOddsRatio;
    }

    public String getFemaleP() {
        return femaleP;
    }

    public void setFemaleP(String femaleP) {
        this.femaleP = femaleP;
    }

    public String getFemaleOddsRatio() {
        return femaleOddsRatio;
    }

    public void setFemaleOddsRatio(String femaleOddsRatio) {
        this.femaleOddsRatio = femaleOddsRatio;
    }

    public String getParameterId() {
        return parameterId;
    }

    public void setParameterId(String parameterId) {
        this.parameterId = parameterId;
    }

    public String getMetadataGroup() {
        return metadataGroup;
    }

    public void setMetadataGroup(String metadataGroup) {
        this.metadataGroup = metadataGroup;
    }

    public Integer getGenotypeId() {
        return genotypeId;
    }

    public void setGenotypeId(Integer genotypeId) {
        this.genotypeId = genotypeId;
    }

    public Integer getZygosity() {
        return zygosity;
    }

    public void setZygosity(Integer zygosity) {
        this.zygosity = zygosity;
    }

    public Integer getStrain() {
        return strain;
    }

    public void setStrain(Integer strain) {
        this.strain = strain;
    }

    public Integer getCentre() {
        return centre;
    }

    public void setCentre(Integer centre) {
        this.centre = centre;
    }

    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public String getFailureMessage() {
        return failureMessage;
    }

    public void setFailureMessage(String failureMessage) {
        this.failureMessage = failureMessage;
    }

    public Float getBonferoniByLine() {
        return bonferoniByLine;
    }

    public void setBonferoniByLine(Float bonferoniByLine) {
        this.bonferoniByLine = bonferoniByLine;
    }

    public Float getBonferoniByParameter() {
        return bonferoniByParameter;
    }

    public void setBonferoniByParameter(Float bonferoniByParameter) {
        this.bonferoniByParameter = bonferoniByParameter;
    }

    public Float getHochbergByLine() {
        return hochbergByLine;
    }

    public void setHochbergByLine(Float hochbergByLine) {
        this.hochbergByLine = hochbergByLine;
    }

    public Float getHochbergByParameter() {
        return hochbergByParameter;
    }

    public void setHochbergByParameter(Float hochbergByParameter) {
        this.hochbergByParameter = hochbergByParameter;
    }

    public Float getRefRangeThreshold() {
        return refRangeThreshold;
    }

    public void setRefRangeThreshold(Float refRangeThreshold) {
        this.refRangeThreshold = refRangeThreshold;
    }

    public Float getRefRangeThresholdMales() {
        return refRangeThresholdMales;
    }

    public void setRefRangeThresholdMales(Float refRangeThresholdMales) {
        this.refRangeThresholdMales = refRangeThresholdMales;
    }

    public Float getRefRangeThresholdFemale() {
        return refRangeThresholdFemale;
    }

    public void setRefRangeThresholdFemale(Float refRangeThresholdFemale) {
        this.refRangeThresholdFemale = refRangeThresholdFemale;
    }

    public Float getRankSumP() {
        return rankSumP;
    }

    public void setRankSumP(Float rankSumP) {
        this.rankSumP = rankSumP;
    }

    public Float getRankSumPMale() {
        return rankSumPMale;
    }

    public void setRankSumPMale(Float rankSumPMale) {
        this.rankSumPMale = rankSumPMale;
    }

    public Float getRankSumPFemale() {
        return rankSumPFemale;
    }

    public void setRankSumPFemale(Float rankSumPFemale) {
        this.rankSumPFemale = rankSumPFemale;
    }

    public String getMMfitquality2() {
        return mMfitquality2;
    }

    public void setMMfitquality2(String mMfitquality2) {
        this.mMfitquality2 = mMfitquality2;
    }

    public String getMMfitquality3() {
        return mMfitquality3;
    }

    public void setMMfitquality3(String mMfitquality3) {
        this.mMfitquality3 = mMfitquality3;
    }

    public String getMMfitquality4() {
        return mMfitquality4;
    }

    public void setMMfitquality4(String mMfitquality4) {
        this.mMfitquality4 = mMfitquality4;
    }

    public String getMMfitquality5() {
        return mMfitquality5;
    }

    public void setMMfitquality5(String mMfitquality5) {
        this.mMfitquality5 = mMfitquality5;
    }

    public String getMMfitquality6() {
        return mMfitquality6;
    }

    public void setMMfitquality6(String mMfitquality6) {
        this.mMfitquality6 = mMfitquality6;
    }

    public String getRankSumEFMale() {
        return rankSumEFMale;
    }

    public void setRankSumEFMale(String rankSumEFMale) {
        this.rankSumEFMale = rankSumEFMale;
    }

    public String getRankSumEFFemale() {
        return rankSumEFFemale;
    }

    public void setRankSumEFFemale(String rankSumEFFemale) {
        this.rankSumEFFemale = rankSumEFFemale;
    }

    public String getCsvFile() {
        return csvFile;
    }

    public void setCsvFile(String csvFile) {
        this.csvFile = csvFile;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getYMP() {
        return yMP;
    }

    public void setYMP(String yMP) {
        this.yMP = yMP;
    }

    public String getYMP1() {
        return yMP1;
    }

    public void setYMP1(String yMP1) {
        this.yMP1 = yMP1;
    }

    public Double getPvalueDouble() {
        return pvalueDouble;
    }

    public void setPvalueDouble(Double pvalueDouble) {
        this.pvalueDouble = pvalueDouble;
    }
}
